#!/usr/bin/env python3
"""Local, dependency-free AMI to Carpenters webhook bridge for FreePBX 17."""

from __future__ import annotations

import argparse
import base64
import binascii
import dataclasses
import datetime as dt
import ipaddress
import json
import logging
import os
import queue
import shlex
import signal
import socket
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Callable


VERSION = "1.0.0"
LOGGER = logging.getLogger("carpenters-freepbx-adapter")
PLACEHOLDERS = {"", "CHANGE_ME", "CHANGE_ME_AMI", "CHANGE_ME_WEBHOOK"}


class ConfigurationError(ValueError):
    pass


class AmiError(RuntimeError):
    pass


def load_env_file(path: str) -> None:
    env_path = Path(path)
    if not env_path.is_file():
        raise ConfigurationError(f"Konfigurationsdatei nicht gefunden: {env_path}")
    for line_number, raw_line in enumerate(env_path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ConfigurationError(f"Ungültige Zeile {line_number} in {env_path}")
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not name or not name.replace("_", "").isalnum():
            raise ConfigurationError(f"Ungültiger Variablenname in Zeile {line_number}")
        try:
            parsed_value = shlex.split(value, comments=False, posix=True)
        except ValueError as error:
            raise ConfigurationError(f"Ungültiger Wert in Zeile {line_number} in {env_path}") from error
        if len(parsed_value) != 1:
            raise ConfigurationError(f"Ungültiger Wert in Zeile {line_number} in {env_path}")
        os.environ.setdefault(name, parsed_value[0])


def require_secret(name: str) -> str:
    encoded_value = os.environ.get(f"{name}_B64", "").strip()
    if encoded_value:
        try:
            value = base64.b64decode(encoded_value, validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError) as error:
            raise ConfigurationError(f"{name}_B64 ist keine gültige Base64-Kodierung.") from error
    else:
        value = os.environ.get(name, "").strip()
    if value in PLACEHOLDERS or len(value) < 16 or any(character in value for character in "\r\n\0"):
        raise ConfigurationError(f"{name} fehlt oder ist zu kurz (mindestens 16 Zeichen).")
    return value


def validated_https_url(name: str) -> str:
    value = os.environ.get(name, "").strip()
    parsed = urllib.parse.urlparse(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise ConfigurationError(f"{name} muss eine vollständige HTTPS-URL ohne Zugangsdaten oder Fragment sein.")
    return value


def validated_loopback_host(value: str) -> str:
    host = value.strip().lower()
    if host == "localhost":
        return host
    try:
        if ipaddress.ip_address(host).is_loopback:
            return host
    except ValueError as error:
        raise ConfigurationError("AMI_HOST muss auf localhost beziehungsweise eine Loopback-Adresse zeigen.") from error
    raise ConfigurationError("AMI_HOST muss auf localhost beziehungsweise eine Loopback-Adresse zeigen.")


@dataclasses.dataclass(frozen=True)
class AdapterConfig:
    ami_host: str
    ami_port: int
    ami_username: str
    ami_password: str
    ringing_url: str
    answered_url: str
    ended_url: str
    webhook_secret: str
    inbound_context_prefixes: tuple[str, ...]
    http_timeout_seconds: float
    log_level: str

    @classmethod
    def from_environment(cls) -> "AdapterConfig":
        host = validated_loopback_host(os.environ.get("AMI_HOST", "127.0.0.1"))
        try:
            port = int(os.environ.get("AMI_PORT", "5038"))
        except ValueError as error:
            raise ConfigurationError("AMI_PORT muss eine Portnummer sein.") from error
        if not 1 <= port <= 65535:
            raise ConfigurationError("AMI_PORT liegt außerhalb des gültigen Bereichs.")

        username = os.environ.get("AMI_USERNAME", "").strip()
        if not username or len(username) > 80 or any(character in username for character in "\r\n\0"):
            raise ConfigurationError("AMI_USERNAME ist ungültig.")

        prefixes = tuple(
            prefix.strip().lower()
            for prefix in os.environ.get(
                "INBOUND_CONTEXT_PREFIXES",
                "from-trunk,from-pstn,from-did,ext-did"
            ).split(",")
            if prefix.strip()
        )
        if not prefixes:
            raise ConfigurationError("INBOUND_CONTEXT_PREFIXES darf nicht leer sein.")

        try:
            timeout = float(os.environ.get("HTTP_TIMEOUT_SECONDS", "5"))
        except ValueError as error:
            raise ConfigurationError("HTTP_TIMEOUT_SECONDS muss eine Zahl sein.") from error
        if not 1 <= timeout <= 30:
            raise ConfigurationError("HTTP_TIMEOUT_SECONDS muss zwischen 1 und 30 liegen.")

        level = os.environ.get("LOG_LEVEL", "INFO").upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR"}:
            raise ConfigurationError("LOG_LEVEL muss DEBUG, INFO, WARNING oder ERROR sein.")

        return cls(
            ami_host=host,
            ami_port=port,
            ami_username=username,
            ami_password=require_secret("AMI_PASSWORD"),
            ringing_url=validated_https_url("CARPENTERS_RINGING_URL"),
            answered_url=validated_https_url("CARPENTERS_ANSWERED_URL"),
            ended_url=validated_https_url("CARPENTERS_ENDED_URL"),
            webhook_secret=require_secret("CARPENTERS_WEBHOOK_SECRET"),
            inbound_context_prefixes=prefixes,
            http_timeout_seconds=timeout,
            log_level=level
        )


def parse_ami_message(block: bytes) -> dict[str, str]:
    message: dict[str, str] = {}
    for raw_line in block.decode("utf-8", errors="replace").replace("\r\n", "\n").split("\n"):
        if ":" not in raw_line:
            continue
        name, value = raw_line.split(":", 1)
        message[name.strip().lower()] = value.strip()
    return message


class AmiConnection:
    def __init__(self, config: AdapterConfig):
        self.config = config
        self.socket: socket.socket | None = None
        self.buffer = b""

    def connect(self) -> None:
        self.close()
        self.socket = socket.create_connection(
            (self.config.ami_host, self.config.ami_port),
            timeout=10
        )
        self.socket.settimeout(30)
        self._send_action({
            "Action": "Login",
            "Username": self.config.ami_username,
            "Secret": self.config.ami_password,
            "Events": "on"
        })
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            message = self.read_message()
            response = message.get("response", "").lower()
            if not response:
                continue
            if response == "success":
                LOGGER.info("AMI-Anmeldung erfolgreich auf %s:%s", self.config.ami_host, self.config.ami_port)
                return
            raise AmiError("AMI-Anmeldung wurde abgelehnt. Benutzername, Passwort und Rechte prüfen.")
        raise AmiError("Keine AMI-Anmeldebestätigung empfangen.")

    def _send_action(self, fields: dict[str, str]) -> None:
        if not self.socket:
            raise AmiError("AMI-Verbindung ist nicht geöffnet.")
        payload = "".join(f"{name}: {value}\r\n" for name, value in fields.items()) + "\r\n"
        self.socket.sendall(payload.encode("utf-8"))

    def ping(self) -> None:
        self._send_action({"Action": "Ping"})

    def read_message(self) -> dict[str, str]:
        if not self.socket:
            raise AmiError("AMI-Verbindung ist nicht geöffnet.")
        while b"\r\n\r\n" not in self.buffer:
            chunk = self.socket.recv(65_536)
            if not chunk:
                raise AmiError("AMI-Verbindung wurde geschlossen.")
            self.buffer += chunk
            if len(self.buffer) > 2_000_000:
                raise AmiError("AMI-Nachrichtenpuffer überschreitet das Sicherheitslimit.")
        block, self.buffer = self.buffer.split(b"\r\n\r\n", 1)
        return parse_ami_message(block)

    def close(self) -> None:
        if self.socket:
            try:
                self._send_action({"Action": "Logoff"})
            except (OSError, AmiError):
                pass
            try:
                self.socket.close()
            except OSError:
                pass
        self.socket = None
        self.buffer = b""


@dataclasses.dataclass(frozen=True)
class WebhookTask:
    event: str
    payload: dict[str, object]


class WebhookDispatcher:
    def __init__(self, config: AdapterConfig):
        self.config = config
        self.tasks: queue.Queue[WebhookTask | None] = queue.Queue(maxsize=1_000)
        self.thread = threading.Thread(target=self._run, name="webhook-dispatcher", daemon=True)
        self.urls = {
            "ringing": config.ringing_url,
            "answered": config.answered_url,
            "ended": config.ended_url
        }

    def start(self) -> None:
        self.thread.start()

    def submit(self, task: WebhookTask) -> None:
        try:
            self.tasks.put_nowait(task)
        except queue.Full:
            LOGGER.error("Webhook-Warteschlange ist voll; Ereignis %s konnte nicht vorgemerkt werden.", task.event)

    def close(self) -> None:
        try:
            self.tasks.put_nowait(None)
        except queue.Full:
            pass
        self.thread.join(timeout=15)

    def _run(self) -> None:
        while True:
            task = self.tasks.get()
            try:
                if task is None:
                    return
                self._deliver(task)
            finally:
                self.tasks.task_done()

    def _deliver(self, task: WebhookTask) -> None:
        body = json.dumps(task.payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        request = urllib.request.Request(
            self.urls[task.event],
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": f"CarpentersFreePbxAdapter/{VERSION}",
                "X-Carpenters-FreePBX-Secret": self.config.webhook_secret
            }
        )
        for attempt in range(1, 4):
            try:
                with urllib.request.urlopen(
                    request,
                    timeout=self.config.http_timeout_seconds,
                    context=ssl.create_default_context()
                ) as response:
                    if 200 <= response.status < 300:
                        LOGGER.info("Webhook %s für call_id=%s angenommen", task.event, task.payload.get("call_id"))
                        return
                    raise RuntimeError(f"HTTP {response.status}")
            except (urllib.error.URLError, urllib.error.HTTPError, OSError, RuntimeError) as error:
                if attempt == 3:
                    LOGGER.error(
                        "Webhook %s für call_id=%s nach drei Versuchen fehlgeschlagen: %s",
                        task.event,
                        task.payload.get("call_id"),
                        error
                    )
                    return
                time.sleep(2 ** (attempt - 1))


@dataclasses.dataclass
class InboundRoot:
    unique_id: str
    caller_number: str
    called_number: str
    seen_monotonic: float


@dataclasses.dataclass
class TrackedCall:
    call_id: str
    root_unique_id: str
    caller_number: str
    called_number: str
    started_monotonic: float
    ringing_sent: bool = False
    answered_monotonic: float | None = None
    answered_sent: bool = False


def utc_timestamp() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class CallTracker:
    def __init__(self, context_prefixes: tuple[str, ...], submit: Callable[[WebhookTask], None]):
        self.context_prefixes = context_prefixes
        self.submit = submit
        self.inbound_roots: dict[str, InboundRoot] = {}
        self.calls: dict[str, TrackedCall] = {}

    def _is_inbound_context(self, context: str) -> bool:
        lowered = context.lower()
        return any(lowered.startswith(prefix) for prefix in self.context_prefixes)

    @staticmethod
    def _call_id(message: dict[str, str]) -> str:
        return message.get("linkedid") or message.get("destlinkedid") or message.get("uniqueid", "")

    def handle(self, message: dict[str, str]) -> None:
        event = message.get("event", "").lower()
        if not event:
            return
        self._prune()
        if event == "newchannel":
            self._handle_new_channel(message)
        elif event == "dialbegin":
            self._handle_dial_begin(message)
        elif event in {"newstate", "bridgeenter"}:
            self._handle_answered(message)
        elif event == "dialend":
            self._handle_dial_end(message)
        elif event == "hangup":
            self._handle_hangup(message)

    def _handle_new_channel(self, message: dict[str, str]) -> None:
        context = message.get("context", "")
        if not self._is_inbound_context(context):
            return
        call_id = self._call_id(message)
        unique_id = message.get("uniqueid", "")
        if not call_id or not unique_id:
            return
        self.inbound_roots.setdefault(call_id, InboundRoot(
            unique_id=unique_id,
            caller_number=message.get("calleridnum", ""),
            called_number=message.get("exten", ""),
            seen_monotonic=time.monotonic()
        ))

    def _handle_dial_begin(self, message: dict[str, str]) -> None:
        call_id = self._call_id(message)
        if not call_id:
            return
        root = self.inbound_roots.get(call_id)
        if root is None and not self._is_inbound_context(message.get("context", "")):
            return
        now = time.monotonic()
        caller_number = message.get("calleridnum", "") or (root.caller_number if root else "")
        called_number = (
            message.get("destexten", "")
            or message.get("exten", "")
            or (root.called_number if root else "")
        )
        call = self.calls.get(call_id)
        if call is None:
            call = TrackedCall(
                call_id=call_id,
                root_unique_id=root.unique_id if root else message.get("uniqueid", call_id),
                caller_number=caller_number,
                called_number=called_number,
                started_monotonic=now
            )
            self.calls[call_id] = call
        elif called_number:
            call.called_number = called_number
        if not call.ringing_sent and call.caller_number:
            call.ringing_sent = True
            self.submit(WebhookTask("ringing", self._payload(call)))

    def _handle_dial_end(self, message: dict[str, str]) -> None:
        if message.get("dialstatus", "").upper() != "ANSWER":
            return
        self._handle_answered(message)

    def _handle_answered(self, message: dict[str, str]) -> None:
        event = message.get("event", "").lower()
        if event == "newstate" and not (
            message.get("channelstatedesc", "").lower() == "up"
            or message.get("channelstate") == "6"
        ):
            return
        call = self.calls.get(self._call_id(message))
        if not call or call.answered_sent:
            return
        # The provider channel can be answered by an IVR before a handset picks
        # up. Waiting for a destination channel or a real bridge prevents the
        # Carpenters UI from showing "answered" too early.
        if event == "newstate" and message.get("uniqueid") == call.root_unique_id:
            return
        if event == "bridgeenter" and message.get("bridgetype", "").lower() == "holding":
            return
        call.answered_monotonic = time.monotonic()
        call.answered_sent = True
        self.submit(WebhookTask("answered", self._payload(call)))

    def _handle_hangup(self, message: dict[str, str]) -> None:
        unique_id = message.get("uniqueid", "")
        call_id = self._call_id(message)
        call = self.calls.get(call_id)
        if call is None and unique_id:
            call = next((entry for entry in self.calls.values() if entry.root_unique_id == unique_id), None)
        if not call or unique_id not in {call.root_unique_id, call.call_id}:
            return
        duration = 0
        if call.answered_monotonic is not None:
            duration = max(0, int(time.monotonic() - call.answered_monotonic))
        payload = self._payload(call)
        payload["duration_seconds"] = duration
        self.submit(WebhookTask("ended", payload))
        self.calls.pop(call.call_id, None)
        self.inbound_roots.pop(call.call_id, None)

    @staticmethod
    def _payload(call: TrackedCall) -> dict[str, object]:
        return {
            "call_id": call.call_id,
            "caller_number": call.caller_number,
            "called_number": call.called_number,
            "timestamp": utc_timestamp()
        }

    def _prune(self) -> None:
        cutoff = time.monotonic() - 12 * 60 * 60
        self.inbound_roots = {
            key: value for key, value in self.inbound_roots.items()
            if value.seen_monotonic >= cutoff
        }
        self.calls = {
            key: value for key, value in self.calls.items()
            if value.started_monotonic >= cutoff
        }


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )


def check_connection(config: AdapterConfig) -> int:
    configure_logging(config.log_level)
    connection = AmiConnection(config)
    try:
        connection.connect()
        print("OK: Konfiguration gültig und AMI-Anmeldung erfolgreich.")
        return 0
    finally:
        connection.close()


def run(config: AdapterConfig) -> int:
    configure_logging(config.log_level)
    stop_event = threading.Event()

    def request_stop(_signal_number: int, _frame: object) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    dispatcher = WebhookDispatcher(config)
    tracker = CallTracker(config.inbound_context_prefixes, dispatcher.submit)
    dispatcher.start()
    delay = 1
    try:
        while not stop_event.is_set():
            connection = AmiConnection(config)
            try:
                connection.connect()
                delay = 1
                while not stop_event.is_set():
                    try:
                        message = connection.read_message()
                    except socket.timeout:
                        connection.ping()
                        continue
                    tracker.handle(message)
            except (OSError, AmiError) as error:
                LOGGER.warning("AMI-Verbindung unterbrochen: %s; neuer Versuch in %s Sekunden", error, delay)
                stop_event.wait(delay)
                delay = min(delay * 2, 60)
            finally:
                connection.close()
    finally:
        dispatcher.close()
    return 0


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", help="Environment-Datei vor dem Start laden")
    parser.add_argument("--check", action="store_true", help="Konfiguration und AMI-Anmeldung testen")
    parser.add_argument("--validate-config", action="store_true", help="Nur Konfiguration prüfen")
    parser.add_argument("--version", action="version", version=VERSION)
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    try:
        if arguments.env_file:
            load_env_file(arguments.env_file)
        config = AdapterConfig.from_environment()
        if arguments.validate_config:
            print("OK: Konfiguration ist vollständig und sicher.")
            return 0
        if arguments.check:
            return check_connection(config)
        return run(config)
    except ConfigurationError as error:
        print(f"Konfigurationsfehler: {error}", file=sys.stderr)
        return 2
    except (OSError, AmiError) as error:
        print(f"Verbindungsfehler: {error}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
