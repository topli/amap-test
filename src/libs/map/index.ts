import AMapLoader from "@amap/amap-jsapi-loader"
// 加载Map
export const mapLoader = () => {
  // window._AMapSecurityConfig = {
  //   securityJsCode: "d0543d6e1c9f40e8272aa30af54e8ded",
  // };
  const defOpt = {
    key: "c3e7f3c92d50384dbc51fd567d22e1c5", // 申请好的Web端开发者Key，首次调用 load 时必填
    version: "2.0", // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    plugins: [], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
  }
  return AMapLoader.load(defOpt)
}
// 初始化map
export const initMap = (el: string | Element, options: any) => {
  return new window.AMap.Map(el, options)
}