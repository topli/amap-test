import { useEffect } from "react"
import * as THREE from "three"
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import './map.css'

import path from "./path.json"

// import styles from "./map.css";

import { getAngle, updateMapCenter, updateMapRotation } from './utils'
import { initMap, mapLoader } from "../libs/map"
import CoordsUtils from "../libs/map/coordsUtils"

const allPath = []

for (let i = 0; i < path.features.length; i++) {
  const p = path.features[i];
  allPath.push(...p.geometry.coordinates[0])
}

console.log(allPath);


interface CarModel {
  model: object,
  paths: Array<AMap.LngLat>,
  cameraFollow: boolean,
  controller: TWEEN.Tween
}


// class CarModel {
//   historyPaths: []
//   paths: []
//   controller: null
//   constructor(lngLat: AMap.LngLat, controller: TWEEN.Tween) {
//     this.historyPaths.push(lngLat)
//     this.paths.push(lngLat)
//     this.controller = controller

//     this.controller.start()
//   }

//   move(lngLat: AMap.LngLat) {
//     this.historyPaths.push(lngLat)
//     this.paths.push(lngLat)
//     this.controller.update()
//   }
// }


export default function MapContainer() {

  // 地图
  let map = null
  // 相机
  let camera = null
  // 渲染器
  let renderer = null
  // 场景
  let scene = null
  // 模型
  const models: Array<CarModel> = [
    {
      model: null,
      paths: [
        [113.532592, 22.788501]
      ],
      cameraFollow: false,
    },
    {
      model: null,
      paths: [
        [113.532553, 22.78832]
      ],
      cameraFollow: false,
    }
  ]
  
  // 自定义层
  let gllayer = null
  let crdut = null
  let customCoords = null
  let mapCenter = null
  // const NPCGroup = new THREE.Group()

  useEffect(() => {
    // 模拟数据推送
    const simulationWS = () => {
      let index1 = 0
      let index2 = allPath.length - 1
      const inter = setInterval(() => {
        if (index1 === allPath.length - 1) {
          clearInterval(inter)
        }
        index1 = index1 + 1
        index2 = index2 - 1
        if (models[0].paths.length > 1) {
          const frist = models[0].paths[1]
          models[0].paths = [frist, allPath[index1]]
        } else {
          models[0].paths.push(allPath[index1])
          
        }
        
        const p = crdut.lngLatsToCoords(models[0].paths).map(item => {
          return new THREE.Vector3().fromArray([item[0], item[1], []])
        })
        models[0].controller && models[0].controller.stop()
        models[0].controller = new TWEEN.Tween(p[0]).easing(TWEEN.Easing.Linear.None).onUpdate(onUpdate(models[0].model))
        models[0].controller.to(p[1], 800).start()
        
        if (models[1].paths.length > 1) {
          const frist = models[1].paths[1]
          models[1].paths = [frist, allPath[index2]]
        } else {
          models[1].paths.push(allPath[index2])
        }
        
        const p2 = crdut.lngLatsToCoords(models[1].paths).map(item => {
          return new THREE.Vector3().fromArray([item[0], item[1], []])
        })
        models[1].controller && models[1].controller.stop()
        models[1].controller = new TWEEN.Tween(p2[0]).easing(TWEEN.Easing.Linear.None).onUpdate(onUpdate(models[1].model))
        models[1].controller.to(p2[1], 800).start()
        
      }, 1000)
    }
    // 初始化模型
    const initModel = () => {
      return new Promise((resolve) => {
        const loader = new GLTFLoader()
        loader.load('https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf', function (gltf) {
          const group = new THREE.Group()
          const model = gltf.scene.children[0]
          model.rotation.set(1.5, 1.2, 0)
          // 调试代码
          const axesHelper = new THREE.AxesHelper(50)
          axesHelper.position.set(1,1,1)

          // 调整模型大小
          const size = 0.1
          model.scale.set(size, size, size)
          group.add(model)
          group.add(axesHelper)
          resolve(group)
        })
      })
    }

    const onUpdate = function (model: object) {
      return function (res) {
        console.log(res);
        
        // const point = new THREE.Vector3().fromArray([res[0], res[1], res[2]])
        // console.log(point);
        model.position.copy(res)
        model.lookAt(res)
        model.up.set(0, 0, 1)
        
      }
    }

    // 初始化物体
    const initNPC = async () => {
      const model = await initModel()
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        m.model = model.clone()
        const startPoint = m.paths[0]
        console.log(startPoint);
        
        const coords = crdut.lngLatsToCoords([startPoint]).map(item => {
          return new THREE.Vector3().fromArray([item[0], item[1], []])
        })
        console.log('coords', coords);
        const start = [...coords[0]]
        console.log('start', start);
        
        m.model.position.copy(coords[0])
        // m.model.lookAt(coords[1])
        m.model.up.set(0, 0, 1)
        // m.controller = new TWEEN.Tween(coords[0])
        //   .easing(TWEEN.Easing.Linear.None)
        //   .onUpdate(onUpdate(m.model))
        //   .onStart(() => {
        //     console.log('start');
        //   })
        // NPCGroup.add(m.model)
      }
    }
    const initLight = () => {
      // 环境光照和平行光
      const aLight = new THREE.AmbientLight(0xffffff, 0.3)
      const dLight = new THREE.DirectionalLight(0xffffff, 1)
      dLight.position.set(1000, -100, 900)
      scene.add(dLight)
      scene.add(aLight)
    }

    // 初始化动画层
    const initLayer = () => {
      return new AMap.GLCustomLayer({
          // 图层的层级
          zIndex: 150,
          // 初始化的操作，创建图层过程中执行一次。
          init: async (gl) => {
            // 这里我们的地图模式是 3D，所以创建一个透视相机，相机的参数初始化可以随意设置，因为在 render 函数中，每一帧都需要同步相机参数，因此这里变得不那么重要。
            // 如果你需要 2D 地图（viewMode: '2D'），那么你需要创建一个正交相机
            // eslint-disable-next-line react-hooks/exhaustive-deps
            camera = new THREE.PerspectiveCamera(
              60,
              window.innerWidth / window.innerHeight,
              100,
              1 << 30
            )

            // eslint-disable-next-line react-hooks/exhaustive-deps
            renderer = new THREE.WebGLRenderer({
              context: gl, // 地图的 gl 上下文
              // alpha: true,
              // antialias: true,
              // canvas: gl.canvas,
            })

            // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
            renderer.autoClear = false
            // eslint-disable-next-line react-hooks/exhaustive-deps
            scene = new THREE.Scene()
            // 初始化灯光
            initLight()
            await initNPC()
            // initController()
            
            for (let i = 0; i < models.length; i++) {
              const m = models[i]
              scene.add(m.model)
              console.log(m.model);
              
            }

            simulationWS()
            animate()
            // setTimeout(() => {
            //   animate()
            // }, 5000)
          },
          render: () => {
            // 这里必须执行！！重新设置 three 的 gl 上下文状态。
            renderer.resetState()
            // 重新设置图层的渲染中心点，将模型等物体的渲染中心点重置
            // 否则和 LOCA 可视化等多个图层能力使用的时候会出现物体位置偏移的问题
            customCoords.setCenter(mapCenter)
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
            console.log('render');
            
            renderer.render(scene, camera)

            // 这里必须执行！！重新设置 three 的 gl 上下文状态。
            renderer.resetState()
          },
      })
    }
    const initController = () => {
      // 状态记录器
      const target = { t: 0 }
      // 获取第一段线段的移动时长，具体实现就是两个坐标点的距离除以速度参数speed

      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        m.controller = new TWEEN.Tween(target)
          .to({ t: 1 }, 2000)
          .easing(TWEEN.Easing.Linear.None)
          .onUpdate(() => {
            console.log('update');
            
            const coords = crdut.lngLatsToCoords(m.paths).map(item => {
              return new THREE.Vector3().fromArray([item[0], item[1], []])
            })
            
            // 获取当前位置在路径上的位置
            const point = new THREE.Vector3().copy(coords[0])
            // 计算下一个路径点的位置
            const nextPoint = new THREE.Vector3().copy(coords[1])
            // 计算物体应该移动到的位置，并移动物体
            const position = new THREE.Vector3().copy(point).lerp(nextPoint, target.t)
            console.log(position);
            
            if (m.model) {
              console.log(m.model);
              
              // 更新NPC的位置
              m.model.position.copy(position)
            }

            // 需要镜头跟随
            if (m.cameraFollow) {
              // 计算两个lngLat端点的中间值
              // const pointLngLat = new THREE.Vector3().copy(m.paths[0])
              // const nextPointLngLat = new THREE.Vector3().copy(m.paths[1])
              // const positionLngLat = new THREE.Vector3().copy(pointLngLat).lerp(nextPointLngLat, target.t)
              // 更新地图镜头位置
              // updateMapCenter(map, positionLngLat)
            }

            // 更新地图朝向
            if (m.cameraFollow) {
              // const angle = getAngle(position, _PATH_COORDS[(npc_step + 3) % _PATH_COORDS.length])
              // updateMapRotation(map, angle)
            }
          })
          .onStart(() => {
            console.log(123);
            
            const nextPoint = m.paths[1]
            // 更新主体的正面朝向
            if (m.model && nextPoint) {
              m.model.lookAt(nextPoint)
              m.model.up.set(0, 0, 1)
            }
          })
          .onComplete(() => {
            console.log('onComplete');
            
            // 重新出发
            target.t = 0
            m.controller
              .stop()
              .to({ t: 1 }, 2000)
              .start()
          })
          .start()
      }
    }
    // 逐帧动画处理
    const animate = () => {
      for (let i = 0; i < models.length; i++) {
        const m = models[i]
        if (m.controller) {
          m.controller.update()
        }
      }

      if (map) {
        map.render()
      }
      requestAnimationFrame(() => {
        animate()
      })
    }
    mapLoader().then(async () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mapCenter = new AMap.LngLat(113.532592, 22.788501)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      map = initMap("container", {
        // 设置地图容器id
        viewMode: "3D", // 是否为3D地图模式
        zoom: 18, // 初始化地图级别
        pitch: 45,
        center: mapCenter
      })

      // eslint-disable-next-line react-hooks/exhaustive-deps
      crdut = new CoordsUtils(map, mapCenter)
      customCoords = map.customCoords

      // eslint-disable-next-line react-hooks/exhaustive-deps
      gllayer = initLayer()
      
      map.add(gllayer)
      
      // initController()
    })

    // AMapLoader.load({
    //   key: "c3e7f3c92d50384dbc51fd567d22e1c5", // 申请好的Web端开发者Key，首次调用 load 时必填
    //   version: "2.0", // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    //   plugins: [], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
    // })
    //   .then((AMap) => {
    //     // 数据转换工具
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    //     map = new AMap.Map("container", {
    //       // 设置地图容器id
    //       viewMode: "3D", // 是否为3D地图模式
    //       zoom: 18, // 初始化地图级别
    //       pitch: 45
    //     })
    //     const customCoords = map.customCoords
        
    //     const centerP = [_PATH_LNG_LAT[0].x, _PATH_LNG_LAT[0].y]

    //     map.setCenter(centerP)
    //     const groupNpc = new THREE.Group()
    //     // 加载主体NPC
    //     function getModel () {
    //       return new Promise((resolve) => {
    //         const loader = new GLTFLoader()
    //         loader.load('https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf', function (gltf) {
    //           const model = gltf.scene.children[0]
    //           model.rotation.set(0,4.5,0)
    //           // 调试代码
    //           const axesHelper = new THREE.AxesHelper(50)
    //           axesHelper.position.set(1,1,1)

    //           // 调整模型大小
    //           const size = 0.1
    //           model.scale.set(size, size, size)
    //           groupNpc.add(model)
    //           groupNpc.add(axesHelper)
    //           resolve(groupNpc)
    //         })
    //       })
    //     }
    //     // 初始化主体NPC的状态
    //     const initNPC = () => {
    //       getModel().then(() => {
    //         // z轴朝上
    //         groupNpc.up.set(0, 0, 1)

    //         // 初始位置和朝向
    //         if (_PATH_COORDS.length > 1) {
    //           groupNpc.position.copy(_PATH_COORDS[0])
    //           groupNpc.lookAt(_PATH_COORDS[1])
    //         }
    //         // 添加到场景中
    //         scene.add(groupNpc)
    //       })
    //     }
    //     let camera
    //     let renderer
    //     let scene
    //     // 数据使用转换工具进行转换，这个操作必须要提前执行（在获取镜头参数 函数之前执行），否则将会获得一个错误信息。
    //     const data = customCoords.lngLatsToCoords([centerP])
    //     // 创建 GL 图层
    //     const gllayer = new AMap.GLCustomLayer({
    //       // 图层的层级
    //       zIndex: 150,
    //       // 初始化的操作，创建图层过程中执行一次。
    //       init: (gl) => {
    //         // 这里我们的地图模式是 3D，所以创建一个透视相机，相机的参数初始化可以随意设置，因为在 render 函数中，每一帧都需要同步相机参数，因此这里变得不那么重要。
    //         // 如果你需要 2D 地图（viewMode: '2D'），那么你需要创建一个正交相机
    //         camera = new THREE.PerspectiveCamera(
    //           60,
    //           window.innerWidth / window.innerHeight,
    //           100,
    //           1 << 30
    //         )

    //         renderer = new THREE.WebGLRenderer({
    //           context: gl, // 地图的 gl 上下文
    //           // alpha: true,
    //           // antialias: true,
    //           // canvas: gl.canvas,
    //         })

    //         // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
    //         renderer.autoClear = false
    //         scene = new THREE.Scene()

    //         // 环境光照和平行光
    //         const aLight = new THREE.AmbientLight(0xffffff, 0.3)
    //         const dLight = new THREE.DirectionalLight(0xffffff, 1)
    //         dLight.position.set(1000, -100, 900)
    //         scene.add(dLight)
    //         scene.add(aLight)

    //         // initGltf()
    //         initNPC()
    //         initController()
    //         setTimeout(() => {
    //           animate()
    //         }, 5000)
    //       },
    //       render: () => {
    //         // 这里必须执行！！重新设置 three 的 gl 上下文状态。
    //         renderer.resetState()
    //         // 重新设置图层的渲染中心点，将模型等物体的渲染中心点重置
    //         // 否则和 LOCA 可视化等多个图层能力使用的时候会出现物体位置偏移的问题
    //         customCoords.setCenter(centerP)
    //         const { near, far, fov, up, lookAt, position } = customCoords.getCameraParams()
            
    //         // 2D 地图下使用的正交相机
    //         // var { near, far, top, bottom, left, right, position, rotation } = customCoords.getCameraParams();
            
    //         // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
    //         camera.near = near
    //         camera.far = far
    //         camera.fov = fov
    //         camera.position.set(...position)
    //         camera.up.set(...up)
    //         camera.lookAt(...lookAt)
    //         camera.updateProjectionMatrix()

    //         // 2D 地图使用的正交相机参数赋值
    //         // camera.top = top;
    //         // camera.bottom = bottom;
    //         // camera.left = left;
    //         // camera.right = right;
    //         // camera.position.set(...position);
    //         // camera.updateProjectionMatrix();

    //         renderer.render(scene, camera)

    //         // 这里必须执行！！重新设置 three 的 gl 上下文状态。
    //         renderer.resetState()
    //       },
    //     })
    //     map.add(gllayer)

    //     let npc_step = 0
    //     let _rayController = null
    //     const getNextStepIndex = () => {
    //       return npc_step + 1
    //     }
    //     const getMoveDuration = () => {
    //       return 1000
    //     }

    //     // 是否镜头跟随NPC移动
    //     const cameraFollow = false 

    //     const initController = () => {
    //       // 状态记录器
    //       const target = { t: 0 }
    //       // 获取第一段线段的移动时长，具体实现就是两个坐标点的距离除以速度参数speed
    //       const duration = getMoveDuration()

    //       _rayController = new TWEEN.Tween(target)
    //         .to({ t: 1 }, duration)
    //         .easing(TWEEN.Easing.Linear.None)
    //         .onUpdate(() => {
    //           // 终点坐标索引
    //           const nextIndex = getNextStepIndex()
    //           // 获取当前位置在路径上的位置
    //           const point = new THREE.Vector3().copy(_PATH_COORDS[npc_step])
    //           // 计算下一个路径点的位置
    //           const nextPoint = new THREE.Vector3().copy(_PATH_COORDS[nextIndex])
    //           // 计算物体应该移动到的位置，并移动物体
    //           const position = new THREE.Vector3().copy(point).lerp(nextPoint, target.t)
    //           if (groupNpc) {
    //             // 更新NPC的位置
    //             groupNpc.position.copy(position)
    //           }

    //           // 需要镜头跟随
    //           if (cameraFollow) {
    //             // 计算两个lngLat端点的中间值
    //             const pointLngLat = new THREE.Vector3().copy(_PATH_LNG_LAT[npc_step])
    //             const nextPointLngLat = new THREE.Vector3().copy(_PATH_LNG_LAT[nextIndex])
    //             const positionLngLat = new THREE.Vector3().copy(pointLngLat).lerp(nextPointLngLat, target.t)
    //             // 更新地图镜头位置
    //             updateMapCenter(map, positionLngLat)
    //           }

    //           // 更新地图朝向
    //           if (cameraFollow) {
    //             const angle = getAngle(position, _PATH_COORDS[(npc_step + 3) % _PATH_COORDS.length])
    //             updateMapRotation(map, angle)
    //           }
    //         })
    //         .onStart(() => {
    //           const nextPoint = _PATH_COORDS[(npc_step + 3) % _PATH_COORDS.length]

    //           // 更新主体的正面朝向
    //           if (groupNpc) {
    //             groupNpc.lookAt(nextPoint)
    //             groupNpc.up.set(0, 0, 1)
    //           }
    //         })
    //         .onComplete(() => {
    //           // 更新到下一段路线
    //           npc_step = getNextStepIndex()
    //           // 调整时长
    //           const duration = getMoveDuration()
    //           // 重新出发
    //           target.t = 0
    //           _rayController
    //             .stop()
    //             .to({ t: 1 }, duration)
    //             .start()
    //         })
    //         .start()
    //     }

    //     // 逐帧动画处理
    //     const animate = (time) => {

    //       if (_rayController) {
    //         _rayController.update(time)
    //       }

    //       if (map) {
    //         map.render()
    //       }
    //       requestAnimationFrame(() => {
    //         animate()
    //       })
    //     }
    //   })
    //   .catch((e) => {
    //     console.log(e)
    //   })

    return () => {
      // if (ram) cancelAnimationFrame(ram)
      map?.destroy()
    }
  }, [])

  return <div id="container" className="amap-container" style={{ height: "800px" }}></div>
}
