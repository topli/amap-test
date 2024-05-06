/**
 * 坐标转换工具类
 */
class CoordsUtils {
  map: AMap.Map
  center: AMap.LngLat
  customCoords = null
  constructor(map: AMap.Map, center: AMap.LngLat) {
    this.map = map
    this.center = center
    this.customCoords = map.customCoords
  }

  lngLatsToCoords(arr: Array<AMap.LngLat>) {
    return this.customCoords.lngLatsToCoords(arr)
  }
}

export default CoordsUtils