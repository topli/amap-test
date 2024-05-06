import { useEffect } from "react"
import * as THREE from "three"
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import './map.css'

import path from "../path.json"

const allPath = []
path.routes[0].steps.forEach((item: any) => {
  allPath.push(...item.path)
})

// console.log(allPath)

// import styles from "./map.css";
import AMapLoader from "@amap/amap-jsapi-loader"
import { getRoute } from "./utils"

export default function MapContainer() {
  let map = null

  const ram = null
  useEffect(() => {
    AMapLoader.load({
      key: "c3e7f3c92d50384dbc51fd567d22e1c5", // 申请好的Web端开发者Key，首次调用 load 时必填
      version: "2.0", // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
      plugins: [], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
    })
      .then(async (AMap) => {
        // 合并后的路径数据（空间坐标）
        const _PATH_COORDS = []
        // 合并后的路径数据（地理坐标）
        const _PATH_LNG_LAT = []
        const _NPC_ALTITUDE = []
        let _data = []
        // 数据转换工具
        // eslint-disable-next-line react-hooks/exhaustive-deps
        map = new AMap.Map("container", {
          // 设置地图容器id
          viewMode: "3D", // 是否为3D地图模式
          zoom: 15, // 初始化地图级别
          pitch: 55
        })
        const customCoords = map.customCoords

        const res = await getRoute(map)
        /**
         * 处理单条路径数据
         * @param {Array} path 地理坐标数据，支持海拔 [[x,y,z]...]
         * @returns {Array} 空间坐标数据，支持海拔 [[x',y',z']...]
         */
        const handleOnePath = (path) => {
          const len = _PATH_COORDS.length
          const arr = path.map(v => {
            return [v[0], v[1], v[2] || _NPC_ALTITUDE]
          })

          // 如果与前线段有重复点，则去除重复坐标点
          if (len > 0) {
            const { x, y, z } = _PATH_LNG_LAT[len - 1]
            if (JSON.stringify([x, y, z]) === JSON.stringify(arr[0])) {
              arr.shift()
            }
          }

          // 合并地理坐标
          _PATH_LNG_LAT.push(...arr.map(v => new THREE.Vector3().fromArray(v)))

          // 转换空间坐标
          // customCoords.lngLatsToCoords会丢失z轴数据，需要重新赋值
          const xyArr = customCoords.lngLatsToCoords(arr).map((v, i) => {
            return [v[0], v[1], arr[i][2] || _NPC_ALTITUDE]
          })
          // 合并空间坐标
          _PATH_COORDS.push(...xyArr.map(v => new THREE.Vector3().fromArray(v)))
          // 返回空间坐标
          return arr
        }
        //处理转换图层基础数据的地理坐标为空间坐标,保留z轴数据
        const initData = (geoJSON) => {
            const { features } = geoJSON
            _data = JSON.parse(JSON.stringify(features))

            _data.forEach((feature, index) => {
              const { geometry } = feature
              const { type, coordinates } = geometry

              if (type === 'MultiLineString') {
                feature.geometry.coordinates = coordinates.map(sub => {
                  return handleOnePath(sub)
                })
              }
              if (type === 'LineString') {
                feature.geometry.coordinates = handleOnePath(coordinates)
              }
            })
        }
        initData(res)
        console.log(res);
        
        const centerP = [113.532592, 22.788501]

        // 加载主体NPC
        function getModel () {
          return new Promise((resolve) => {
            const loader = new GLTFLoader()
            loader.load('https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf', function (gltf) {
              const model = gltf.scene.children[0]
              console.log(model);
              
              // 调试代码
              // const axesHelper = new THREE.AxesHelper(50)
              // model.add(axesHelper)

              // 调整模型大小
              const size = 0.1
              model.scale.set(size, size, size)

              resolve(model)
            })
          })
        }

        let duck = null
        // 初始化主体NPC的状态
        const initNPC = () => {
          getModel().then(NPC => {
            duck = NPC
            // z轴朝上
            NPC.up.set(0, 0, 1)

            // 初始位置和朝向
            if (_PATH_COORDS.length > 1) {
              NPC.position.copy(_PATH_COORDS[0])
              NPC.lookAt(_PATH_COORDS[1])
            }
            // 添加到场景中
            scene.add(NPC)
          })
        }
        let camera
        let renderer
        let scene
        // 数据使用转换工具进行转换，这个操作必须要提前执行（在获取镜头参数 函数之前执行），否则将会获得一个错误信息。
        const data = customCoords.lngLatsToCoords([centerP])
        let object
        const objPosition = centerP

        // 创建 GL 图层
        const gllayer = new AMap.GLCustomLayer({
          // 图层的层级
          zIndex: 150,
          // 初始化的操作，创建图层过程中执行一次。
          init: (gl) => {
            // 这里我们的地图模式是 3D，所以创建一个透视相机，相机的参数初始化可以随意设置，因为在 render 函数中，每一帧都需要同步相机参数，因此这里变得不那么重要。
            // 如果你需要 2D 地图（viewMode: '2D'），那么你需要创建一个正交相机
            camera = new THREE.PerspectiveCamera(
              60,
              window.innerWidth / window.innerHeight,
              100,
              1 << 30
            )

            renderer = new THREE.WebGLRenderer({
              context: gl, // 地图的 gl 上下文
              // alpha: true,
              // antialias: true,
              // canvas: gl.canvas,
            })

            // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
            renderer.autoClear = false
            scene = new THREE.Scene()

            // 环境光照和平行光
            const aLight = new THREE.AmbientLight(0xffffff, 0.3)
            const dLight = new THREE.DirectionalLight(0xffffff, 1)
            dLight.position.set(1000, -100, 900)
            scene.add(dLight)
            scene.add(aLight)

            // initGltf()
            initNPC()
            initController()
            setTimeout(() => {
              animate()
            }, 5000);
          },
          render: () => {
            // 这里必须执行！！重新设置 three 的 gl 上下文状态。
            renderer.resetState()
            // 重新设置图层的渲染中心点，将模型等物体的渲染中心点重置
            // 否则和 LOCA 可视化等多个图层能力使用的时候会出现物体位置偏移的问题
            customCoords.setCenter(centerP)
            const { near, far, fov, up, lookAt, position } = customCoords.getCameraParams()
            
            // 2D 地图下使用的正交相机
            // var { near, far, top, bottom, left, right, position, rotation } = customCoords.getCameraParams();
            
            // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
            camera.near = near
            camera.far = far
            camera.fov = fov
            camera.position.set(...position)
            camera.up.set(...up)
            camera.lookAt(...lookAt)
            camera.updateProjectionMatrix()

            // 2D 地图使用的正交相机参数赋值
            // camera.top = top;
            // camera.bottom = bottom;
            // camera.left = left;
            // camera.right = right;
            // camera.position.set(...position);
            // camera.updateProjectionMatrix();

            renderer.render(scene, camera)

            // 这里必须执行！！重新设置 three 的 gl 上下文状态。
            renderer.resetState()
          },
        })
        map.add(gllayer)

        let npc_step = 0
        let _rayController = null
        const getNextStepIndex = () => {
          return npc_step + 1
        }

        // 是否镜头跟随NPC移动
        const cameraFollow = true 

        const initController = () => {
          // 状态记录器
          const target = { t: 0 }
          // 获取第一段线段的移动时长，具体实现就是两个坐标点的距离除以速度参数speed
          const duration = 5000

          _rayController = new TWEEN.Tween(target)
            .to({ t: 1 }, duration)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => {
              
              const NPC = duck
              // 终点坐标索引
              const nextIndex = getNextStepIndex()
              console.log(npc_step);
              console.log(nextIndex);
              
              
              // 获取当前位置在路径上的位置
              const point = new THREE.Vector3().copy(_PATH_COORDS[npc_step])
              
              // 计算下一个路径点的位置
              const nextPoint = new THREE.Vector3().copy(_PATH_COORDS[nextIndex])
              // 计算物体应该移动到的位置，并移动物体
              const position = new THREE.Vector3().copy(point).lerp(nextPoint, target.t)
              if (NPC) {
                
                // 更新NPC的位置
                NPC.position.copy(position)
              }

              // 需要镜头跟随
              if (cameraFollow) {
                // 计算两个lngLat端点的中间值
                // const pointLngLat = new THREE.Vector3().copy(_PATH_LNG_LAT[npc_step])
                // const nextPointLngLat = new THREE.Vector3().copy(_PATH_LNG_LAT[nextIndex])
                // const positionLngLat = new THREE.Vector3().copy(pointLngLat).lerp(nextPointLngLat, target.t)
                // // 更新地图镜头位置
                // updateMapCenter(positionLngLat)
              }

              // 更新地图朝向
              if (cameraFollow) {
                // const angle = getAngle(position, _PATH_COORDS[(npc_step + 3) % _PATH_COORDS.length])
                // updateMapRotation(angle)
              }
            })
            .onStart(() => {
              console.log('onStart');

              const nextPoint = _PATH_COORDS[(npc_step + 3) % _PATH_COORDS.length]

              // 更新主体的正面朝向
              if (duck) {
                duck.lookAt(nextPoint)
                duck.up.set(0, 0, 1)
              }
            })
            .onComplete(() => {
              console.log('onComplete');
              // 更新到下一段路线
              npc_step = npc_step + 1
              // 调整时长
              const duration = 5000
              // 重新出发
              target.t = 0
              _rayController
                .stop()
                .to({ t: 1 }, duration)
                .start()
            })
            .start()
        }

        // 逐帧动画处理
        const animate = (time) => {
          // 逐帧更新控制器，非常重要
          if (_rayController) {
            _rayController.update(time)
          }

          if (map) {
            map.render()
          }
          requestAnimationFrame(() => {
            animate()
          })
        }

        // 更新地图中心到指定位置
        const updateMapCenter = (positionLngLat) => {
          // duration = 0 防止画面抖动
          map.panTo([positionLngLat.x, positionLngLat.y], 0)
        }

        //更新地图旋转角度
        const updateMapRotation = (angle) => {
          if (Math.abs(angle) >= 1.0) {
            map.setRotation(angle, true, 0)
          }
        }

        /**
         * 计算从当前位置到目标位置的移动方向与y轴的夹角
         * 顺时针为正，逆时针为负
         * @param {Object} origin 起始位置 {x,y}
         * @param  {Object} target 终点位置 {x,y}
         * @returns {number}
         */
        const getAngle = (origin, target) => {
          const deltaX = target.x - origin.x
          const deltaY = target.y - origin.y
          const rad = Math.atan2(deltaY, deltaX)
          let angle = rad * 180 / Math.PI
          angle = angle >= 0 ? angle : 360 + angle
          angle = 90 - angle // 将角度转换为与y轴的夹角
          const res = angle >= -180 ? angle : angle + 360 // 确定顺逆时针方向
          return res * -1
        }

        // // 改变模型位置和角度
        // const centerPoint = turf.point(centerP)
        // let timer = 0
        // const startMove = () => {
        //   // eslint-disable-next-line react-hooks/exhaustive-deps
        //   ram = requestAnimationFrame(() => {
        //     timer += 0.4
        //     const pos = turf.transformTranslate(centerPoint, 0.3, timer)
        //       .geometry.coordinates
        //     const angle = timer
        //     setPosition(pos)
        //     setAngle(angle)
        //     // 执行地图的渲染
        //     map.render()
        //     startMove()
        //   })
        // }
        // // 初始化模型
        // function initGltf() {
        //   const duckLoader = new GLTFLoader()
          
        //   duckLoader.load(
        //     "https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf",
        //     (gltf) => {
        //       object = gltf.scene
        //       object.scale.set(30, 30, 30)
        //       setRotation({
        //         x: 90,
        //         y: 0,
        //         z: 0,
        //       })
        //       setPosition(objPosition)
        //       scene.add(object)
        //       // startMove()
        //     }
        //   )
        //   // const loader = new OBJLoader()
        //   // loader.load(
        //   //   "../static/threeModel/city.obj",
        //   //   (gltf) => {
        //   //     console.log(gltf);
              
        //   //     object = gltf
        //   //     object.scale.set(0.1, 0.1, 0.1)
        //   //     setRotation({
        //   //       x: 0,
        //   //       y: 90,
        //   //       z: 90,
        //   //     })
        //   //     setPosition(objPosition)
        //   //     scene.add(object)
        //   //     // startMove()
        //   //   }
        //   // )
        // }
        // function setRotation(rotation) {
        //   const x = (Math.PI / 180) * (rotation.x || 0)
        //   const y = (Math.PI / 180) * (rotation.y || 0)
        //   const z = (Math.PI / 180) * (rotation.z || 0)
        //   object.rotation.set(x, y, z)
        // }

        // function setPosition(lnglat) {
        //   // 对模型的经纬度进行转换
        //   const position = customCoords.lngLatsToCoords([lnglat])[0]
        //   object.position.setX(position[0])
        //   object.position.setY(position[1])
        // }
        // function setAngle(angle) {
        //   const x = object.rotation.x
        //   const z = object.rotation.z
        //   const y = (Math.PI / 180) * angle
        //   object.rotation.set(x, y, z)
        // }
      })
      .catch((e) => {
        console.log(e)
      })

    return () => {
      if (ram) cancelAnimationFrame(ram)
      map?.destroy()
    }
  }, [])

  return <div id="container" className="amap-container" style={{ height: "800px" }}></div>
}
