import importlib.util
import pathlib
import sys
import tempfile
import time
import unittest
from unittest import mock


MODULE_PATH = pathlib.Path(__file__).parents[1] / "adapter.py"
SPEC = importlib.util.spec_from_file_location("freepbx_adapter", MODULE_PATH)
adapter = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = adapter
SPEC.loader.exec_module(adapter)


class CallTrackerTests(unittest.TestCase):
    def setUp(self):
        self.tasks = []
        self.tracker = adapter.CallTracker(
            ("from-trunk", "from-pstn", "from-did", "ext-did"),
            self.tasks.append
        )

    def test_incoming_call_lifecycle_uses_linked_id_and_root_hangup(self):
        self.tracker.handle({
            "event": "Newchannel",
            "context": "from-pstn",
            "uniqueid": "pbx-1.1",
            "linkedid": "pbx-1.1",
            "calleridnum": "0711123450",
            "exten": "497119999"
        })
        self.tracker.handle({
            "event": "DialBegin",
            "context": "ext-group",
            "uniqueid": "pbx-1.1",
            "linkedid": "pbx-1.1",
            "calleridnum": "0711123450",
            "destexten": "20"
        })
        self.tracker.handle({
            "event": "DialEnd",
            "linkedid": "pbx-1.1",
            "dialstatus": "ANSWER"
        })
        self.tracker.handle({
            "event": "Hangup",
            "uniqueid": "pbx-1.2",
            "linkedid": "pbx-1.1"
        })
        self.assertEqual([task.event for task in self.tasks], ["ringing", "answered"])

        time.sleep(0.01)
        self.tracker.handle({
            "event": "Hangup",
            "uniqueid": "pbx-1.1",
            "linkedid": "pbx-1.1"
        })
        self.assertEqual([task.event for task in self.tasks], ["ringing", "answered", "ended"])
        self.assertEqual(self.tasks[0].payload["caller_number"], "0711123450")
        self.assertEqual(self.tasks[0].payload["called_number"], "20")
        self.assertGreaterEqual(self.tasks[-1].payload["duration_seconds"], 0)

    def test_internal_call_is_ignored(self):
        self.tracker.handle({
            "event": "Newchannel",
            "context": "from-internal",
            "uniqueid": "pbx-2.1",
            "linkedid": "pbx-2.1",
            "calleridnum": "20",
            "exten": "21"
        })
        self.tracker.handle({
            "event": "DialBegin",
            "context": "from-internal",
            "uniqueid": "pbx-2.1",
            "linkedid": "pbx-2.1",
            "calleridnum": "20",
            "destexten": "21"
        })
        self.assertEqual(self.tasks, [])

    def test_channel_up_marks_call_answered_before_dial_end(self):
        self.tracker.handle({
            "event": "Newchannel",
            "context": "from-trunk-sip-provider",
            "uniqueid": "pbx-3.1",
            "linkedid": "pbx-3.1",
            "calleridnum": "0711123450",
            "exten": "497119999"
        })
        self.tracker.handle({
            "event": "DialBegin",
            "linkedid": "pbx-3.1",
            "uniqueid": "pbx-3.1",
            "destexten": "20"
        })
        self.tracker.handle({
            "event": "Newstate",
            "linkedid": "pbx-3.1",
            "uniqueid": "pbx-3.2",
            "channelstate": "6",
            "channelstatedesc": "Up"
        })
        self.tracker.handle({
            "event": "DialEnd",
            "linkedid": "pbx-3.1",
            "dialstatus": "ANSWER"
        })
        self.assertEqual([task.event for task in self.tasks], ["ringing", "answered"])

    def test_provider_preanswer_and_holding_bridge_do_not_mark_answered(self):
        self.tracker.handle({
            "event": "Newchannel",
            "context": "from-pstn",
            "uniqueid": "pbx-4.1",
            "linkedid": "pbx-4.1",
            "calleridnum": "0711123450",
            "exten": "497119999"
        })
        self.tracker.handle({
            "event": "DialBegin",
            "linkedid": "pbx-4.1",
            "uniqueid": "pbx-4.1",
            "destexten": "20"
        })
        self.tracker.handle({
            "event": "Newstate",
            "linkedid": "pbx-4.1",
            "uniqueid": "pbx-4.1",
            "channelstatedesc": "Up"
        })
        self.tracker.handle({
            "event": "BridgeEnter",
            "linkedid": "pbx-4.1",
            "uniqueid": "pbx-4.1",
            "bridgetype": "holding"
        })
        self.assertEqual([task.event for task in self.tasks], ["ringing"])


class ParserTests(unittest.TestCase):
    def test_ami_message_parser_is_case_insensitive(self):
        message = adapter.parse_ami_message(
            b"Event: DialBegin\r\nLinkedid: pbx-3.1\r\nCallerIDNum: 0711\r\n"
        )
        self.assertEqual(message["event"], "DialBegin")
        self.assertEqual(message["linkedid"], "pbx-3.1")
        self.assertEqual(message["calleridnum"], "0711")

    def test_env_loader_supports_secure_shell_quoting(self):
        with tempfile.NamedTemporaryFile("w", encoding="utf-8") as env_file:
            env_file.write("AMI_PASSWORD='abc'\"'\"'def mit leerzeichen'\n")
            env_file.flush()
            with mock.patch.dict(adapter.os.environ, {}, clear=True):
                adapter.load_env_file(env_file.name)
                self.assertEqual(adapter.os.environ["AMI_PASSWORD"], "abc'def mit leerzeichen")

    def test_base64_secret_supports_special_characters(self):
        with mock.patch.dict(adapter.os.environ, {
            "AMI_PASSWORD_B64": "YWJjJ2RlZiBtaXQgISQiemVpY2hlbg=="
        }, clear=True):
            self.assertEqual(adapter.require_secret("AMI_PASSWORD"), "abc'def mit !$\"zeichen")

    def test_module_environment_builds_complete_configuration(self):
        content = "\n".join([
            "AMI_HOST='127.0.0.1'",
            "AMI_PORT='5038'",
            "AMI_USERNAME='carpenters'",
            "AMI_PASSWORD_B64='YWJjJ2RlZiBtaXQgISQiemVpY2hlbg=='",
            "CARPENTERS_RINGING_URL='https://crm.example.de/ringing'",
            "CARPENTERS_ANSWERED_URL='https://crm.example.de/answered'",
            "CARPENTERS_ENDED_URL='https://crm.example.de/ended'",
            "CARPENTERS_WEBHOOK_SECRET_B64='MDEyMzQ1Njc4OWFiY2RlZg=='",
            "INBOUND_CONTEXT_PREFIXES='from-trunk,from-pstn'",
            "HTTP_TIMEOUT_SECONDS='5'",
            "LOG_LEVEL='INFO'",
            ""
        ])
        with tempfile.NamedTemporaryFile("w", encoding="utf-8") as env_file:
            env_file.write(content)
            env_file.flush()
            with mock.patch.dict(adapter.os.environ, {}, clear=True):
                adapter.load_env_file(env_file.name)
                config = adapter.AdapterConfig.from_environment()
                self.assertEqual(config.ami_host, "127.0.0.1")
                self.assertEqual(config.ami_password, "abc'def mit !$\"zeichen")
                self.assertEqual(config.webhook_secret, "0123456789abcdef")


if __name__ == "__main__":
    unittest.main()
