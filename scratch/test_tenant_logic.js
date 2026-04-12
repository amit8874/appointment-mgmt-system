
const sourceUrlIP = '13.203.78.101';
const sourceUrlSubdomain = 'clinic1.myapp.com';
const subdomainIP = sourceUrlIP.split('.')[0];
const subdomainSub = sourceUrlSubdomain.split('.')[0];

const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(sourceUrlIP);
const isIPSub = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(sourceUrlSubdomain);

console.log('IP:', sourceUrlIP, 'isIP:', isIP, 'subdomain:', subdomainIP);
console.log('Subdomain:', sourceUrlSubdomain, 'isIP:', isIPSub, 'subdomain:', subdomainSub);

const tenantHeaderValid = '652345678901234567890123';
const tenantHeaderNull = 'null';
const tenantHeaderUndefined = 'undefined';

const check = (h) => {
    return h && h !== 'null' && h !== 'undefined' && h !== '[object Object]';
};

console.log('Valid:', check(tenantHeaderValid));
console.log('Null:', check(tenantHeaderNull));
console.log('Undefined:', check(tenantHeaderUndefined));
