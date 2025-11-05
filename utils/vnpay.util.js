import crypto from 'crypto';
import qs from 'qs';

export function hmacSHA512(key, data) {
  return crypto.createHmac('sha512', key).update(data, 'utf8').digest('hex');
}
export function buildQuery(params) {
  const sorted = Object.keys(params).sort().reduce((acc,k)=> (acc[k]=params[k], acc), {});
  return qs.stringify(sorted, { encode: true, format: 'RFC3986' });
}
