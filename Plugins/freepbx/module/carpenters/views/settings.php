<?php

if (!defined('FREEPBX_IS_AUTH')) {
    die('No direct script access allowed');
}

$escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>

<div class="container-fluid">
  <h1><?php echo _('Carpenters CRM Adapter'); ?></h1>
  <p class="lead"><?php echo _('Securely transfers incoming Asterisk call states to the Carpenters CRM webhooks.'); ?></p>

  <?php foreach ($messages as $message): ?>
    <div class="alert alert-<?php echo $escape($message['type']); ?>" role="alert">
      <pre style="margin:0;white-space:pre-wrap;background:transparent;border:0;color:inherit;padding:0"><?php echo $escape($message['text']); ?></pre>
    </div>
  <?php endforeach; ?>

  <div class="panel panel-default">
    <div class="panel-heading"><strong><?php echo _('Status'); ?></strong></div>
    <div class="panel-body">
      <p>
        <?php echo _('Adapter process:'); ?>
        <span class="label label-<?php echo $processOnline ? 'success' : 'default'; ?>">
          <?php echo $escape($processStatus); ?>
        </span>
      </p>
      <p><?php echo _('Protected environment file:'); ?> <code><?php echo $escape($configPath); ?></code></p>
      <p class="text-muted"><?php echo _('Passwords are never displayed again. Leave both password fields empty to keep the saved values.'); ?></p>
    </div>
  </div>

  <form method="post" action="?display=carpenters" autocomplete="off">
    <input type="hidden" name="carpenters_csrf" value="<?php echo $escape($csrfToken); ?>">

    <div class="panel panel-primary">
      <div class="panel-heading"><strong><?php echo _('Local Asterisk Manager Interface'); ?></strong></div>
      <div class="panel-body">
        <div class="alert alert-info">
          <?php echo _('AMI remains restricted to 127.0.0.1:5038. Create a separate read-only AMI user named carpenters under Settings → Asterisk Managers.'); ?>
        </div>
        <div class="row">
          <div class="col-md-6 form-group">
            <label for="ami_username"><?php echo _('AMI username'); ?></label>
            <input id="ami_username" name="ami_username" class="form-control" required maxlength="80" value="<?php echo $escape($config['AMI_USERNAME'] ?? 'carpenters'); ?>">
          </div>
          <div class="col-md-6 form-group">
            <label for="ami_password"><?php echo _('AMI password'); ?></label>
            <input id="ami_password" name="ami_password" type="password" class="form-control" minlength="16" autocomplete="new-password" placeholder="<?php echo $hasAmiPassword ? _('Saved – leave empty to keep') : _('At least 16 characters'); ?>">
          </div>
        </div>
      </div>
    </div>

    <div class="panel panel-primary">
      <div class="panel-heading"><strong><?php echo _('Carpenters HTTPS webhooks'); ?></strong></div>
      <div class="panel-body">
        <?php foreach ([
            ['ringing_url', 'CARPENTERS_RINGING_URL', _('Ringing URL')],
            ['answered_url', 'CARPENTERS_ANSWERED_URL', _('Answered URL')],
            ['ended_url', 'CARPENTERS_ENDED_URL', _('Ended URL')]
        ] as [$field, $key, $label]): ?>
          <div class="form-group">
            <label for="<?php echo $escape($field); ?>"><?php echo $escape($label); ?></label>
            <input id="<?php echo $escape($field); ?>" name="<?php echo $escape($field); ?>" type="url" class="form-control" required maxlength="2048" value="<?php echo $escape($config[$key] ?? ''); ?>" placeholder="https://carpenters.example.de/api/integrations/freepbx/webhook/...">
          </div>
        <?php endforeach; ?>
        <div class="form-group">
          <label for="webhook_secret"><?php echo _('Carpenters webhook secret'); ?></label>
          <input id="webhook_secret" name="webhook_secret" type="password" class="form-control" minlength="16" autocomplete="new-password" placeholder="<?php echo $hasWebhookSecret ? _('Saved – leave empty to keep') : _('Paste the one-time secret from Carpenters'); ?>">
        </div>
      </div>
    </div>

    <div class="panel panel-default">
      <div class="panel-heading"><strong><?php echo _('Advanced'); ?></strong></div>
      <div class="panel-body">
        <div class="form-group">
          <label for="inbound_context_prefixes"><?php echo _('Incoming context prefixes'); ?></label>
          <input id="inbound_context_prefixes" name="inbound_context_prefixes" class="form-control" required value="<?php echo $escape($config['INBOUND_CONTEXT_PREFIXES'] ?? 'from-trunk,from-pstn,from-did,ext-did'); ?>">
        </div>
        <div class="form-group">
          <label for="log_level"><?php echo _('Log level'); ?></label>
          <select id="log_level" name="log_level" class="form-control">
            <?php foreach (['DEBUG', 'INFO', 'WARNING', 'ERROR'] as $level): ?>
              <option value="<?php echo $level; ?>" <?php echo (($config['LOG_LEVEL'] ?? 'INFO') === $level) ? 'selected' : ''; ?>><?php echo $level; ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="checkbox">
          <label>
            <input type="checkbox" name="enabled" value="1" <?php echo (($config['CARPENTERS_ENABLED'] ?? '0') === '1') ? 'checked' : ''; ?>>
            <?php echo _('Enable adapter and supervise it with the FreePBX PM2 module'); ?>
          </label>
        </div>
      </div>
    </div>

    <button type="submit" name="carpenters_action" value="save" class="btn btn-primary">
      <i class="fa fa-save" aria-hidden="true"></i> <?php echo _('Save and apply'); ?>
    </button>
    <button type="submit" name="carpenters_action" value="test" class="btn btn-default" formnovalidate>
      <i class="fa fa-plug" aria-hidden="true"></i> <?php echo _('Test saved AMI connection'); ?>
    </button>
  </form>
</div>
