'use strict';

// Returns { send({to, subject, text}) -> Promise }. With SMTP settings it sends real email through
// nodemailer; without them it prints the message to the server console (handy for demos and tests).
function createMailer(config) {
  const smtp = config.smtp || {};
  if (!smtp.host) {
    return {
      async send({ to, subject, text }) {
        console.log(`\n[mail:console] To: ${to}\n[mail:console] Subject: ${subject}\n${text}\n`);
      },
    };
  }

  let transporter;
  return {
    async send({ to, subject, text }) {
      transporter ??= require('nodemailer').createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
      await transporter.sendMail({ from: smtp.from, to, subject, text });
    },
  };
}

module.exports = { createMailer };
