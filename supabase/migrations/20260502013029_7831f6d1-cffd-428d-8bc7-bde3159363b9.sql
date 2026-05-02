DELETE FROM automation_queue WHERE email IN ('qa+pl-alt@gate.test','qa+pl-terra@gate.test');
DELETE FROM zazi_outbound_sends WHERE recipient_email IN ('qa+pl-alt@gate.test','qa+pl-terra@gate.test');
DELETE FROM email_events WHERE email IN ('qa+pl-alt@gate.test','qa+pl-terra@gate.test');
DELETE FROM prospects WHERE email IN ('qa+pl-alt@gate.test','qa+pl-terra@gate.test');