export const getRoute = (map) => {
  return new Promise((resolve, reject) => {
    try {
      //最终路径数据
      const PATH_DATA = { features: [] }

      const path = []
      path.push([113.532592, 22.788502]) //起点
      path.push([113.532592, 22.788502]) //经过
      path.push([113.532553, 22.788321]) //终点

      map.plugin("AMap.DragRoute", function () {
        //构造拖拽导航类
        const route = new AMap.DragRoute(map, path, AMap.DrivingPolicy.LEAST_FEE)
        //查询导航路径并开启拖拽导航
        route.search()
        route.on("complete", function ({ type, target, data }) {
          // 获得路径数据后，处理成GeoJSON
          const res = data.routes[0].steps.map((v) => {
            const arr = v.path.map((o) => {
              return [o.lng, o.lat]
            })
            return {
              type: "Feature",
              geometry: {
                type: "MultiLineString",
                coordinates: [arr],
              },
              properties: {
                instruction: v.instruction,
                distance: v.distance,
                duration: v.duration,
                road: v.road,
              },
            }
          })
          PATH_DATA.features = res
          resolve(PATH_DATA)
        })
      })
    } catch (error) {
      console.error(error);
      reject(null)
    }
  })
}
