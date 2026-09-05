"use strict";
/* eslint-disable no-undef, turbo/no-undeclared-env-vars -- Node-owned local quality-gate helper. */

module.exports = async function authenticateLighthouse(browser, context) {
  const cookieHeader = process.env.LHCI_SESSION_COOKIE;
  if (!cookieHeader) return;

  const page = await browser.newPage();
  const origin = new URL(context.url).origin;
  const cookies = cookieHeader.split("; ").map((pair) => {
    const separator = pair.indexOf("=");
    if (separator < 1) throw new Error("Invalid Lighthouse session cookie");
    return {
      httpOnly: true,
      name: pair.slice(0, separator),
      url: origin,
      value: pair.slice(separator + 1),
    };
  });

  await page.setCookie(...cookies);
  await page.close();
};
