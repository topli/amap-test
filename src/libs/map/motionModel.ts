import * as THREE from "three"
import * as TWEEN from '@tweenjs/tween.js'

class MotionModel {
  // 3D模型
  model: object
  // 3D场景
  scene: THREE.SCENE
  // 相机是否跟随
  cameraFollow: boolean
  duration: 1000
  // 动画控制器
  controller: TWEEN.Tween
  // 当前位置
  current
  // 目标位置
  next
  // 判断当前车辆是否移动
  moving: boolean = false

  constructor(model, current) { 
    this._initModel(model, current)
    this._initController(current)
    return this
  }
  private _initModel(model, current) {
    this.model = model.clone()
    // this.model.material = model.material.clone();
    
    this.current = current
    
    this.model.position.copy(current)
  }
  private _initController(current) {
    this.controller = new TWEEN.Tween(current)
      .easing(TWEEN.Easing.Linear.None)
      .onStart(() => {
        // 开始时
        this.moving = true
      })
      .onUpdate((res) => {
        // 更新时
        this.model.position.copy(res)
        this.model.up.set(0,0,1)
      })
      .onComplete(() => {
        // 完成时
        this.moving = false
      })
    return this.controller
  }
  
  setScene(scene: THREE.Scene) {
    this.scene = scene
    this.scene.add(this.model)
    return this
  }

  moveTo(coords, duration) {

    this.next = { ...coords }
    this.controller.stop()

    this._initController(this.model.position)
      .to(this.next, duration || this.duration)
      .start()
    
  }

  update() {
    this.controller.update()
  }
}

export default MotionModel