export const BRAND_ASSET_VERSION = '20260602';

const withBrandVersion = (path) => `${path}?v=${BRAND_ASSET_VERSION}`;

export const SORRISYNC_LOGO_HORIZONTAL = withBrandVersion('/brand/sorrisync-logo-horizontal.png');
export const SORRISYNC_SYMBOL = withBrandVersion('/brand/sorrisync-symbol.png');
