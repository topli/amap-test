/**
 * 计算从当前位置到目标位置的移动方向与y轴的夹角
 * 顺时针为正，逆时针为负
 * @param {Object} origin 起始位置 {x,y}
 * @param  {Object} target 终点位置 {x,y}
 * @returns {number}
 */
export const getAngle = (origin, target) => {
  const deltaX = target.x - origin.x
  const deltaY = target.y - origin.y
  const rad = Math.atan2(deltaY, deltaX)
  let angle = rad * 180 / Math.PI
  angle = angle >= 0 ? angle : 360 + angle
  angle = 90 - angle // 将角度转换为与y轴的夹角
  const res = angle >= -180 ? angle : angle + 360 // 确定顺逆时针方向
  return res * -1
}


// 更新地图中心到指定位置
export const updateMapCenter = (map, lngLat) => {
  // duration = 0 防止画面抖动
  map.panTo([lngLat.x, lngLat.y], 0)
}

//更新地图旋转角度
export const updateMapRotation = (map, angle) => {
  if (Math.abs(angle) >= 1.0) {
    map.setRotation(angle, true, 0)
  }
}