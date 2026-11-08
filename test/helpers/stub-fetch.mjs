// Preload for child-process tests: replaces fetch so no request leaves the machine.
// STUB_STATUS and STUB_BODY control the response.
globalThis.fetch = async () => {
  const status = Number(process.env.STUB_STATUS || 200)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: async () => process.env.STUB_BODY ?? ''
  }
}
