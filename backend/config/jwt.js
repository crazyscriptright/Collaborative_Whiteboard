module.exports = {
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret_change_in_production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_change_in_production',
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES || '15m',
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || '7d',
  
  // Cookie settings for production
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  }
};