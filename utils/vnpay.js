import crypto from "crypto";
import qs from "qs";

export function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(k => sorted[k] = obj[k]);
  return sorted;
}

export function signVnpParams(params, secretKey) {
  const signData = qs.stringify(params, { encode: false });
  return crypto.createHmac("sha512", secretKey)
               .update(Buffer.from(signData, "utf-8"))
               .digest("hex");
}

export function verifyVnpSecureHash(query, secretKey) {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];
  const sorted = sortObject(vnp_Params);
  const signed = signVnpParams(sorted, secretKey);
  return { ok: secureHash === signed, params: vnp_Params };
}
