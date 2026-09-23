import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server (and its /_next HMR assets) to be opened from other
  // devices on the LAN, e.g. http://10.193.96.123:3000. Each `*` matches one
  // hostname label (octet), so the wildcards cover a changing DHCP address.
  allowedDevOrigins: [
    "10.193.73.98",
    "10.193.96.123",
    "172.17.80.1",
    "192.168.1.6",
    "10.193.*.*",
    "10.*.*.*",
    "192.168.*.*",
    "172.*.*.*",
  ],
};

export default nextConfig;
