import { useEffect } from "react"
import * as THREE from "three"
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import MotionModel from '../libs/map/motionModel'

import './map.css'

import path from "./path.json"

import { getAngle, updateMapCenter, updateMapRotation } from './utils'
import { initMap, mapLoader } from "../libs/map"

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
        allPath[allPath.length - 1]
      ],
      cameraFollow: false,
    }
  ]
  
  // 自定义层
  let gllayer = null
  let customCoords = null
  let mapCenter = null



  const lngLatsToCoords = (paths) => {
    return customCoords.lngLatsToCoords(paths).map(item => {
      return new THREE.Vector3().fromArray([item[0], item[1], []])
    })
  }
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
        
        const p = lngLatsToCoords(models[0].paths)
        models[0].model.moveTo(p[1], 800)
        
        if (models[1].paths.length > 1) {
          const frist = models[1].paths[1]
          models[1].paths = [frist, allPath[index2]]
        } else {
          models[1].paths.push(allPath[index2])
        }
        
        const p2 = lngLatsToCoords(models[1].paths)
        models[1].model.moveTo(p2[1], 1500)
        
      }, 2000)
    }
    // 初始化模型
    const initModel = () => {
      return new Promise((resolve) => {
        const loader = new GLTFLoader()
        loader.load('https://a.amap.com/jsapi_demos/static/gltf/Duck.gltf', function (gltf) {
          
          const group = new THREE.Group()
          const model = gltf.scene.children[0]
          console.log(model);
          
          model.rotation.set(1.5, 1.2, 0)
          // 调试代码
          const axesHelper = new THREE.AxesHelper(50)
          axesHelper.position.set(1,1,1)

          // 调整模型大小
          const size = 0.1
          model.scale.set(size, size, size)
          group.add(model)
          group.add(axesHelper)
          resolve(model)
        })
      })
    }

    // 初始化物体
    const initNPC = async () => {
      const model = await initModel()
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        const startPoint = m.paths[0]
        const coords = lngLatsToCoords([startPoint])
        m.model = new MotionModel(model, coords[0])
        m.model.setScene(scene)
        
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
            
            window.addEventListener('resize', () => {
              camera = new THREE.PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                100,
                1 << 30
              )
            })

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

            simulationWS()
            animate()

            function getXYZ(renderer, camera, scene) {
              
              const raycaster = new THREE.Raycaster(); //光线投射，用于确定鼠标点击位置
              const mouse = new THREE.Vector2(); //创建二维平面
              window.addEventListener("mousedown", mousedown); //页面绑定鼠标点击事件
              //点击方法
              function mousedown(e) {
                  console.log(e);
                
                  //将html坐标系转化为webgl坐标系，并确定鼠标点击位置
                  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                  mouse.y = -((e.clientY / window.innerHeight) * 2) + 1;
                  //以camera为z坐标，确定所点击物体的3D空间位置
                  raycaster.setFromCamera(mouse, camera);
                  //确定所点击位置上的物体数量
                  console.log(scene);
                
                  const intersects = raycaster.intersectObjects(scene.children, true);
                  //选中后进行的操作
                  if (intersects.length) {
                      const selected = intersects[0]; //取第一个物体
                      console.log(selected);
                      console.log("x坐标:" + selected.point.x);
                      console.log("y坐标:" + selected.point.y);
                      console.log("z坐标:" + selected.point.z);
                      selected.object.material.color.set(0xff0000);
                  }
              }
            }
            getXYZ(renderer, camera, scene)

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
            
            const coords = lngLatsToCoords(m.paths)
            
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
        if (m.model) {
          m.model.update()
        }
      }

      if (map) {
        map.render()
      }
      requestAnimationFrame(animate)
    }
    mapLoader().then(() => {
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
      customCoords = map.customCoords

      // eslint-disable-next-line react-hooks/exhaustive-deps
      gllayer = initLayer()
      
      map.add(gllayer)
      
    })

    return () => {
      // if (ram) cancelAnimationFrame(ram)
      map?.destroy()
    }
  }, [])

  return <div id="container" className="amap-container"></div>
}
