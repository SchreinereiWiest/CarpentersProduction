<?php

namespace FreePBX\modules;

use BMO;
use FreePBX_Helpers;

class Carpenters extends FreePBX_Helpers implements BMO
{
    private const PROCESS_NAME = 'carpenters-freepbx-adapter';
    private const MIN_SECRET_LENGTH = 16;

    private $FreePBX;
    private array $messages = [];

    public function __construct($freepbx = null)
    {
        if ($freepbx === null) {
            throw new \Exception('Not given a FreePBX Object');
        }
        $this->FreePBX = $freepbx;
    }

    public function install()
    {
        $this->ensureConfigDirectory();
        $config = $this->readConfiguration();
        if (($config['CARPENTERS_ENABLED'] ?? '0') === '1' && $this->configurationComplete($config)) {
            try {
                $this->startAdapter();
                out(_('Carpenters CRM Adapter started.'));
            } catch (\Throwable $error) {
                out(sprintf(_('Carpenters CRM Adapter was installed but could not be started: %s'), $error->getMessage()));
            }
        } else {
            out(_('Carpenters CRM Adapter installed. Configure it under Settings before starting it.'));
        }
    }

    public function uninstall()
    {
        $this->deleteAdapterProcess();
        out(sprintf(
            _('The protected configuration remains at %s. Delete it manually only if it is no longer needed.'),
            $this->configPath()
        ));
    }

    public function backup()
    {
    }

    public function restore($backup)
    {
    }

    public function chownFreepbx()
    {
        return [
            ['type' => 'execdir', 'path' => __DIR__ . '/bin', 'perms' => 0755]
        ];
    }

    public function doConfigPageInit($page)
    {
        if ($page !== 'carpenters' || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            return;
        }

        try {
            $this->assertCsrfToken((string) ($_POST['carpenters_csrf'] ?? ''));
            $action = (string) ($_POST['carpenters_action'] ?? '');
            if ($action === 'save') {
                $this->savePostedConfiguration($_POST);
                $this->messages[] = ['type' => 'success', 'text' => _('Configuration saved securely.')];
            } elseif ($action === 'test') {
                $result = $this->checkAmiConnection();
                $this->messages[] = [
                    'type' => $result['success'] ? 'success' : 'danger',
                    'text' => $result['message']
                ];
            }
        } catch (\Throwable $error) {
            $this->messages[] = ['type' => 'danger', 'text' => $error->getMessage()];
        }
    }

    public function showPage()
    {
        $csrfToken = $this->csrfToken();
        $config = $this->readConfiguration();
        $status = $this->processStatus();
        return load_view(__DIR__ . '/views/settings.php', [
            'config' => $config,
            'configPath' => $this->configPath(),
            'csrfToken' => $csrfToken,
            'hasAmiPassword' => $this->secretValue($config, 'AMI_PASSWORD') !== '',
            'hasWebhookSecret' => $this->secretValue($config, 'CARPENTERS_WEBHOOK_SECRET') !== '',
            'messages' => $this->messages,
            'processOnline' => ($status['pm2_env']['status'] ?? '') === 'online',
            'processStatus' => $status['pm2_env']['status'] ?? 'stopped'
        ]);
    }

    private function savePostedConfiguration(array $post): void
    {
        $current = $this->readConfiguration();
        $amiUsername = trim((string) ($post['ami_username'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9_.-]{1,80}$/', $amiUsername)) {
            throw new \InvalidArgumentException(_('AMI username contains invalid characters.'));
        }

        $amiPassword = (string) ($post['ami_password'] ?? '');
        if ($amiPassword === '') {
            $amiPassword = $this->secretValue($current, 'AMI_PASSWORD');
        }
        $webhookSecret = (string) ($post['webhook_secret'] ?? '');
        if ($webhookSecret === '') {
            $webhookSecret = $this->secretValue($current, 'CARPENTERS_WEBHOOK_SECRET');
        }
        $this->validateSecret($amiPassword, _('AMI password'));
        $this->validateSecret($webhookSecret, _('Carpenters webhook secret'));

        $prefixes = strtolower(trim((string) ($post['inbound_context_prefixes'] ?? '')));
        if (!preg_match('/^[a-z0-9_.-]+(?:\s*,\s*[a-z0-9_.-]+)*$/', $prefixes)) {
            throw new \InvalidArgumentException(_('Incoming context prefixes are invalid.'));
        }
        $prefixes = preg_replace('/\s+/', '', $prefixes);

        $logLevel = strtoupper(trim((string) ($post['log_level'] ?? 'INFO')));
        if (!in_array($logLevel, ['DEBUG', 'INFO', 'WARNING', 'ERROR'], true)) {
            throw new \InvalidArgumentException(_('Invalid log level.'));
        }

        $config = [
            'CARPENTERS_ENABLED' => isset($post['enabled']) ? '1' : '0',
            'AMI_HOST' => '127.0.0.1',
            'AMI_PORT' => '5038',
            'AMI_USERNAME' => $amiUsername,
            'AMI_PASSWORD_B64' => base64_encode($amiPassword),
            'CARPENTERS_RINGING_URL' => $this->validateHttpsUrl((string) ($post['ringing_url'] ?? ''), _('Ringing URL')),
            'CARPENTERS_ANSWERED_URL' => $this->validateHttpsUrl((string) ($post['answered_url'] ?? ''), _('Answered URL')),
            'CARPENTERS_ENDED_URL' => $this->validateHttpsUrl((string) ($post['ended_url'] ?? ''), _('Ended URL')),
            'CARPENTERS_WEBHOOK_SECRET_B64' => base64_encode($webhookSecret),
            'INBOUND_CONTEXT_PREFIXES' => $prefixes,
            'HTTP_TIMEOUT_SECONDS' => '5',
            'LOG_LEVEL' => $logLevel
        ];

        $this->writeConfiguration($config);
        if ($config['CARPENTERS_ENABLED'] === '1') {
            $this->startAdapter();
        } else {
            $this->deleteAdapterProcess();
        }
    }

    private function validateSecret(string $value, string $label): void
    {
        if (strlen($value) < self::MIN_SECRET_LENGTH || preg_match('/[\r\n\0]/', $value)) {
            throw new \InvalidArgumentException(sprintf(_('%s must contain at least 16 characters and no line breaks.'), $label));
        }
    }

    private function validateHttpsUrl(string $value, string $label): string
    {
        $value = trim($value);
        if (strlen($value) > 2048 || preg_match('/[\r\n\0]/', $value)) {
            throw new \InvalidArgumentException(sprintf(_('%s is invalid.'), $label));
        }
        $parts = parse_url($value);
        if (
            !is_array($parts)
            || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
            || empty($parts['host'])
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['fragment'])
        ) {
            throw new \InvalidArgumentException(sprintf(_('%s must be a complete HTTPS URL without credentials or fragment.'), $label));
        }
        return $value;
    }

    private function startAdapter(): void
    {
        if (!$this->FreePBX->Modules->checkStatus('pm2')) {
            throw new \RuntimeException(_('The FreePBX PM2 module is not installed or enabled.'));
        }
        $status = $this->FreePBX->Pm2->start(
            self::PROCESS_NAME,
            __DIR__ . '/bin/run-adapter.sh',
            [],
            true
        );
        $this->FreePBX->Pm2->reset(self::PROCESS_NAME);
        if (($status['pm2_env']['status'] ?? '') !== 'online') {
            throw new \RuntimeException(_('The adapter process did not reach the online state.'));
        }
    }

    private function deleteAdapterProcess(): void
    {
        if (!$this->FreePBX->Modules->checkStatus('pm2')) {
            return;
        }
        try {
            if ($this->FreePBX->Pm2->getStatus(self::PROCESS_NAME)) {
                $this->FreePBX->Pm2->delete(self::PROCESS_NAME);
            }
        } catch (\Throwable $error) {
            // Uninstalling or disabling remains idempotent when PM2 is already stopped.
        }
    }

    private function processStatus()
    {
        if (!$this->FreePBX->Modules->checkStatus('pm2')) {
            return false;
        }
        try {
            return $this->FreePBX->Pm2->getStatus(self::PROCESS_NAME);
        } catch (\Throwable $error) {
            return false;
        }
    }

    private function checkAmiConnection(): array
    {
        $config = $this->readConfiguration();
        if (!$this->configurationComplete($config)) {
            return ['success' => false, 'message' => _('Save a complete configuration before testing AMI.')];
        }
        $command = '/usr/bin/python3 -I '
            . escapeshellarg(__DIR__ . '/bin/adapter.py')
            . ' --env-file ' . escapeshellarg($this->configPath())
            . ' --check 2>&1';
        $output = [];
        $status = 1;
        exec($command, $output, $status);
        $message = trim(implode("\n", array_slice($output, -8)));
        return [
            'success' => $status === 0,
            'message' => $message !== '' ? $message : _('AMI connection test returned no output.')
        ];
    }

    private function configurationComplete(array $config): bool
    {
        foreach (['AMI_USERNAME', 'CARPENTERS_RINGING_URL', 'CARPENTERS_ANSWERED_URL', 'CARPENTERS_ENDED_URL'] as $name) {
            if (empty($config[$name])) {
                return false;
            }
        }
        return strlen($this->secretValue($config, 'AMI_PASSWORD')) >= self::MIN_SECRET_LENGTH
            && strlen($this->secretValue($config, 'CARPENTERS_WEBHOOK_SECRET')) >= self::MIN_SECRET_LENGTH;
    }

    private function configDirectory(): string
    {
        return '/var/lib/asterisk/carpenters';
    }

    private function configPath(): string
    {
        return $this->configDirectory() . '/freepbx-adapter.env';
    }

    private function ensureConfigDirectory(): void
    {
        $directory = $this->configDirectory();
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new \RuntimeException(_('Could not create the protected Carpenters configuration directory.'));
        }
        $webUser = (string) $this->FreePBX->Config->get('AMPASTERISKWEBUSER');
        $webGroup = (string) $this->FreePBX->Config->get('AMPASTERISKWEBGROUP');
        if ($webUser !== '') {
            @chown($directory, $webUser);
        }
        if ($webGroup !== '') {
            @chgrp($directory, $webGroup);
        }
        chmod($directory, 0700);
    }

    private function readConfiguration(): array
    {
        $defaults = [
            'CARPENTERS_ENABLED' => '0',
            'AMI_HOST' => '127.0.0.1',
            'AMI_PORT' => '5038',
            'AMI_USERNAME' => 'carpenters',
            'INBOUND_CONTEXT_PREFIXES' => 'from-trunk,from-pstn,from-did,ext-did',
            'HTTP_TIMEOUT_SECONDS' => '5',
            'LOG_LEVEL' => 'INFO'
        ];
        if (!is_file($this->configPath())) {
            return $defaults;
        }
        foreach (file($this->configPath(), FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            if (preg_match('/^[A-Z][A-Z0-9_]*$/', $name)) {
                $defaults[$name] = $this->unquoteEnvValue(trim($value));
            }
        }
        return $defaults;
    }

    private function writeConfiguration(array $config): void
    {
        $this->ensureConfigDirectory();
        $lines = [
            '# Managed by the Carpenters FreePBX module. File mode: 0600.',
            '# Secrets are Base64 encoded to preserve special characters; Base64 is not encryption.'
        ];
        foreach ($config as $name => $value) {
            $lines[] = $name . '=' . $this->quoteEnvValue((string) $value);
        }
        $temporaryPath = tempnam($this->configDirectory(), '.env-');
        if ($temporaryPath === false) {
            throw new \RuntimeException(_('Could not create a temporary configuration file.'));
        }
        try {
            if (file_put_contents($temporaryPath, implode("\n", $lines) . "\n", LOCK_EX) === false) {
                throw new \RuntimeException(_('Could not write the protected configuration file.'));
            }
            chmod($temporaryPath, 0600);
            if (!rename($temporaryPath, $this->configPath())) {
                throw new \RuntimeException(_('Could not activate the protected configuration file.'));
            }
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }
    }

    private function secretValue(array $config, string $name): string
    {
        $encoded = (string) ($config[$name . '_B64'] ?? '');
        if ($encoded !== '') {
            $decoded = base64_decode($encoded, true);
            return $decoded === false ? '' : $decoded;
        }
        return (string) ($config[$name] ?? '');
    }

    private function quoteEnvValue(string $value): string
    {
        return "'" . str_replace("'", "'\"'\"'", $value) . "'";
    }

    private function unquoteEnvValue(string $value): string
    {
        if (strlen($value) >= 2 && $value[0] === "'" && substr($value, -1) === "'") {
            return str_replace("'\"'\"'", "'", substr($value, 1, -1));
        }
        if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
            $decoded = json_decode($value, true);
            return is_string($decoded) ? $decoded : substr($value, 1, -1);
        }
        return $value;
    }

    private function csrfToken(): string
    {
        if (empty($_SESSION['carpenters_csrf']) || !is_string($_SESSION['carpenters_csrf'])) {
            $_SESSION['carpenters_csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['carpenters_csrf'];
    }

    private function assertCsrfToken(string $provided): void
    {
        $expected = $_SESSION['carpenters_csrf'] ?? '';
        if (!is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
            throw new \RuntimeException(_('The form session has expired. Reload the page and try again.'));
        }
    }
}
