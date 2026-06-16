/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['drive.google.com', 'lh3.googleusercontent.com'],
  },
  api: {
    bodyParser: false,
  },
};

module.exports = nextConfig;
