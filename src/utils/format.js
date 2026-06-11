export function formatKilometers(value) {
  return new Intl.NumberFormat("zh-CN").format(value) + " km";
}

export function formatDistance(value) {
  if (!value) {
    return "太阳系中心";
  }

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} 十亿 km`;
  }

  return `${(value / 1000000).toFixed(2)} 百万 km`;
}

export function formatMoons(value) {
  if (value === null || value === undefined) {
    return "不适用";
  }

  return value === 0 ? "无天然卫星" : `${value} 颗`;
}
