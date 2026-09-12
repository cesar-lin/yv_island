import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
// 3D 小岛漫步 · 小黄鸭一家
// 妈妈鸭（玩家）+ 爸爸鸭 + 鸭宝宝 + 小绵羊，日夜交替 + 天气系统
// ─────────────────────────────────────────────────────────────

export interface IslandGameHandle {
  dispose: () => void
}

// 小岛地形函数：中心高、边缘低，带一点起伏
function terrainHeight(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z)
  const R = 24
  if (r >= R) return -1.2
  const base = 3.0 * Math.pow(1 - r / R, 1.3)
  const hills =
    0.6 * Math.sin(x * 0.4) * Math.cos(z * 0.35) * (1 - r / R) +
    0.3 * Math.sin(x * 1.1 + 2) * Math.sin(z * 0.9) * (1 - r / R)
  const beach = r > R * 0.78 ? -0.4 : 0
  return Math.max(base + hills + beach, -0.6)
}

// ── 小黄鸭工厂 ──────────────────────────────────────────────
interface DuckParts {
  group: THREE.Group
  wingL: THREE.Mesh
  wingR: THREE.Mesh
  head: THREE.Mesh
}

function makeDuck(scale: number, accessory: 'bow' | 'hat' | 'none'): DuckParts {
  const g = new THREE.Group()
  // B.Duck 风格：光滑塑料感材质
  const feather = new THREE.MeshStandardMaterial({
    color: 0xffd21f, // 经典 B.Duck 亮黄
    roughness: 0.35,
    metalness: 0.05,
  })
  const orange = new THREE.MeshStandardMaterial({
    color: 0xff7f11, // B.Duck 橙嘴
    roughness: 0.4,
  })

  // 身体：矮胖圆润
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), feather)
  body.scale.set(1, 0.92, 1.05)
  body.position.y = 0.52
  body.castShadow = true
  g.add(body)

  // 尾巴：圆润上翘的小尖
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), feather)
  tail.scale.set(0.8, 0.7, 1.5)
  tail.position.set(0, 0.72, -0.55)
  tail.rotation.x = -0.5
  tail.castShadow = true
  g.add(tail)

  // 大头：B.Duck 标志性的超大圆头，和身体融为一体
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), feather)
  head.scale.set(1, 0.95, 0.98)
  head.position.set(0, 1.12, 0.18)
  head.castShadow = true
  g.add(head)

  // 又宽又扁的大嘴（上下两片，微微张开像微笑）
  const beakTop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), orange)
  beakTop.scale.set(1.35, 0.42, 1.05)
  beakTop.position.set(0, 1.08, 0.56)
  beakTop.castShadow = true
  g.add(beakTop)
  const beakBottom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), orange)
  beakBottom.scale.set(1.2, 0.32, 0.9)
  beakBottom.position.set(0, 1.0, 0.52)
  g.add(beakBottom)

  // 大眼睛：纯黑椭圆
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.15 })
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), eyeMat)
    eye.scale.set(0.8, 1.15, 0.6)
    eye.position.set(s * 0.2, 1.28, 0.5)
    g.add(eye)
  }

  // 腮红（浅浅的橙色圆斑）
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xffa94d,
    roughness: 0.6,
    transparent: true,
    opacity: 0.7,
  })
  for (const s of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), blushMat)
    blush.scale.set(0.6, 0.5, 0.3)
    blush.position.set(s * 0.3, 1.1, 0.44)
    g.add(blush)
  }

  // 小翅膀：圆鼓鼓贴在身体两侧
  const wingGeo = new THREE.SphereGeometry(0.24, 12, 10)
  wingGeo.scale(0.4, 0.75, 0.95)
  const wingL = new THREE.Mesh(wingGeo, feather)
  wingL.position.set(-0.5, 0.55, 0)
  wingL.castShadow = true
  g.add(wingL)
  const wingR = new THREE.Mesh(wingGeo.clone(), feather)
  wingR.position.set(0.5, 0.55, 0)
  wingR.castShadow = true
  g.add(wingR)

  // 橙色脚蹼：宽宽的蹼
  for (const s of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), orange)
    foot.scale.set(0.85, 0.3, 1.4)
    foot.position.set(s * 0.18, 0.05, 0.12)
    foot.castShadow = true
    g.add(foot)
  }

  // 配饰
  if (accessory === 'bow') {
    // 妈妈：头顶粉色蝴蝶结
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xff6fa5, roughness: 0.4 })
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bowMat)
    knot.position.set(0.18, 1.55, 0.2)
    g.add(knot)
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), bowMat)
      loop.scale.set(1.2, 0.55, 0.7)
      loop.position.set(0.18 + s * 0.14, 1.57, 0.2)
      loop.rotation.z = s * 0.35
      g.add(loop)
    }
  } else if (accessory === 'hat') {
    // 爸爸：蓝色礼帽 + 领结
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2e4a7a, roughness: 0.5 })
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 14), hatMat)
    brim.position.set(0, 1.52, 0.15)
    g.add(brim)
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.26, 14), hatMat)
    top.position.set(0, 1.67, 0.15)
    g.add(top)
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x4a7dff, roughness: 0.4 })
    for (const s of [-1, 1]) {
      const tieWing = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), tieMat)
      tieWing.scale.set(1.1, 0.6, 0.5)
      tieWing.position.set(s * 0.09, 0.92, 0.5)
      g.add(tieWing)
    }
  }

  g.scale.setScalar(scale)
  return { group: g, wingL, wingR, head }
}

// ── 小绵羊工厂 ──────────────────────────────────────────────
interface SheepParts {
  group: THREE.Group
  head: THREE.Group // 头部单独成组，吃草时低下去
  legs: THREE.Group[] // 四条腿，走路时交替摆动
}

// 把几何体顶点沿径向顶出/压入，做出毛茸茸的轮廓
function fluffGeometry(geo: THREE.BufferGeometry, amt: number) {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const n =
      Math.sin(x * 9.1 + 1.3) * Math.sin(y * 8.3) * Math.sin(z * 9.7 + 0.6) +
      0.45 * Math.sin(x * 17.3 + 0.4) * Math.sin(y * 15.1 + 2.2) * Math.sin(z * 16.9 + 1.1)
    const k = 1 + (n / 1.45) * amt
    p.setXYZ(i, x * k, y * k, z * k)
  }
  geo.computeVertexNormals()
  return geo
}

function makeSheep(): SheepParts {
  const g = new THREE.Group()
  const woolMat = new THREE.MeshStandardMaterial({
    color: 0xfaf6ec,
    roughness: 0.95,
    flatShading: true,
  })
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x4a423c, roughness: 0.6 })

  // 身体：毛球轮廓 + 表面顶点抖动 = 一整团蓬松羊毛
  const bodyGeo = fluffGeometry(new THREE.SphereGeometry(0.5, 26, 20), 0.09)
  bodyGeo.scale(1.05, 0.92, 1.25)
  const body = new THREE.Mesh(bodyGeo, woolMat)
  body.position.y = 0.62
  body.castShadow = true
  g.add(body)

  // 头：深色小脸明显探出毛团，头顶盖一圈蓬松的白毛
  const head = new THREE.Group()
  head.position.set(0, 0.84, 0.72)
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), faceMat)
  face.scale.set(0.88, 0.95, 1.05)
  face.position.z = 0.05
  face.castShadow = true
  head.add(face)
  const capGeo = fluffGeometry(new THREE.SphereGeometry(0.26, 14, 10), 0.1)
  capGeo.scale(1, 0.72, 1)
  const cap = new THREE.Mesh(capGeo, woolMat)
  cap.position.set(0, 0.17, -0.1)
  cap.castShadow = true
  head.add(cap)
  // 眼睛
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.15 })
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeMat)
    eye.position.set(s * 0.12, 0.05, 0.24)
    head.add(eye)
  }
  // 小耳朵：向两边翘起
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), faceMat)
    ear.scale.set(1.5, 0.55, 0.6)
    ear.position.set(s * 0.26, 0.12, -0.04)
    ear.rotation.z = s * -0.85
    head.add(ear)
  }
  g.add(head)

  // 四条小细腿（髋部成组，摆动时绕髋部旋转）
  const legs: THREE.Group[] = []
  const legGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.42, 6)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(sx * 0.22, 0.42, sz * 0.32)
      const leg = new THREE.Mesh(legGeo, faceMat)
      leg.position.y = -0.21
      leg.castShadow = true
      hip.add(leg)
      g.add(hip)
      legs.push(hip)
    }
  }

  // 小卷毛尾巴
  const tail = new THREE.Mesh(fluffGeometry(new THREE.IcosahedronGeometry(0.12, 1), 0.12), woolMat)
  tail.position.set(0, 0.72, -0.68)
  g.add(tail)

  return { group: g, head, legs }
}

// ─────────────────────────────────────────────────────────────
export function createIslandGame(container: HTMLElement): IslandGameHandle {
  // ---------- 渲染器 / 场景 / 相机 ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const fog = new THREE.Fog(0x8fd3f4, 60, 160)
  scene.fog = fog

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    400
  )

  // ---------- 灯光 ----------
  const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x3a7d5d, 0.75)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -45
  sun.shadow.camera.right = 45
  sun.shadow.camera.top = 45
  sun.shadow.camera.bottom = -45
  sun.shadow.camera.far = 200
  scene.add(sun)
  scene.add(sun.target)

  // ---------- 天空：太阳 / 月亮 / 星星 ----------
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe27a, fog: false })
  )
  scene.add(sunMesh)
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf2f0e6, fog: false })
  )
  scene.add(moonMesh)

  const starCount = 350
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    // 上半球随机分布
    const a = Math.random() * Math.PI * 2
    const e = Math.random() * Math.PI * 0.45 + 0.05
    const r = 190
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r
    starPos[i * 3 + 1] = Math.sin(e) * r
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
  })
  const stars = new THREE.Points(starGeo, starMat)
  scene.add(stars)

  // ---------- 流星雨 ----------
  interface Meteor {
    mesh: THREE.Mesh
    vel: THREE.Vector3
    life: number
    maxLife: number
  }
  const METEOR_POOL = 10
  const meteors: Meteor[] = []
  const meteorGeoBase = new THREE.ConeGeometry(0.35, 9, 6)
  meteorGeoBase.rotateX(Math.PI / 2) // 尖端朝飞行方向
  for (let i = 0; i < METEOR_POOL; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff6d8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(meteorGeoBase, mat)
    mesh.visible = false
    scene.add(mesh)
    meteors.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1 })
  }
  let meteorTimer = 2 // 距下一颗流星的时间

  // ---------- 海洋 ----------
  const waterGeo = new THREE.PlaneGeometry(400, 400, 64, 64)
  waterGeo.rotateX(-Math.PI / 2)
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x1e6fa8,
    transparent: true,
    opacity: 0.86,
    shininess: 120,
    flatShading: true,
  })
  const water = new THREE.Mesh(waterGeo, waterMat)
  scene.add(water)
  const waterPos = waterGeo.attributes.position
  const waterBase = new Float32Array(waterPos.array as ArrayLike<number>)

  // ---------- 小岛地形 ----------
  const SEG = 120
  const SIZE = 68
  const islandGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
  islandGeo.rotateX(-Math.PI / 2)
  const pos = islandGeo.attributes.position
  const colors: number[] = []
  const cSand = new THREE.Color(0xe8d8a0)
  const cGrass = new THREE.Color(0x58a05c)
  const cGrassDark = new THREE.Color(0x3f7d49)
  const cRock = new THREE.Color(0x8d8578)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = terrainHeight(x, z)
    pos.setY(i, y)
    let c: THREE.Color
    if (y < 0.25) c = cSand
    else if (y < 1.5) c = cGrass.clone().lerp(cGrassDark, Math.random() * 0.5)
    else c = cGrassDark.clone().lerp(cRock, Math.min((y - 1.5) / 1.2, 1))
    colors.push(c.r, c.g, c.b)
  }
  islandGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  islandGeo.computeVertexNormals()
  const island = new THREE.Mesh(
    islandGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })
  )
  island.receiveShadow = true
  scene.add(island)

  // ---------- 装饰 ----------
  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  function makeTree(x: number, z: number) {
    const g = new THREE.Group()
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a5a33, flatShading: true })
    )
    trunk.position.y = 0.45
    trunk.castShadow = true
    g.add(trunk)
    const leafMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x2f7d3f : 0x3d9950,
      flatShading: true,
    })
    const levels = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < levels; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.85 - i * 0.22, 0.9, 7),
        leafMat
      )
      cone.position.y = 1.0 + i * 0.55
      cone.castShadow = true
      g.add(cone)
    }
    g.position.set(x, terrainHeight(x, z), z)
    g.rotation.y = Math.random() * Math.PI * 2
    g.scale.setScalar(rand(0.8, 1.4))
    scene.add(g)
  }

  function makeRock(x: number, z: number) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(0.2, 0.5), 0),
      new THREE.MeshStandardMaterial({ color: 0x9a948a, flatShading: true })
    )
    rock.position.set(x, terrainHeight(x, z) + 0.1, z)
    rock.rotation.set(Math.random(), Math.random(), Math.random())
    rock.castShadow = true
    scene.add(rock)
  }

  function makePalm(x: number, z: number) {
    const g = new THREE.Group()
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.14, 2.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x9c6b3d, flatShading: true })
    )
    trunk.position.y = 1.0
    trunk.rotation.z = 0.18
    trunk.castShadow = true
    g.add(trunk)
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x35a04e,
      flatShading: true,
      side: THREE.DoubleSide,
    })
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.5, 4), leafMat)
      const a = (i / 6) * Math.PI * 2
      leaf.position.set(Math.cos(a) * 0.55 + 0.32, 2.05, Math.sin(a) * 0.55)
      leaf.rotation.z = Math.PI / 2.3
      leaf.rotation.y = -a
      leaf.castShadow = true
      g.add(leaf)
    }
    g.position.set(x, terrainHeight(x, z), z)
    g.rotation.y = Math.random() * Math.PI * 2
    scene.add(g)
  }

  // ── 鸭鸭村落 ────────────────────────────────────────────
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3d, flatShading: true })
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x7a4f2a, flatShading: true })
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a948a, flatShading: true })
  const lanternGlowMats: THREE.MeshStandardMaterial[] = [] // 夜晚点亮
  const lanternLights: THREE.PointLight[] = []

  // 小屋
  function makeHouse(x: number, z: number, rotY: number, wallColor: number, roofColor: number) {
    const g = new THREE.Group()
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.0, 2.6),
      new THREE.MeshStandardMaterial({ color: wallColor, flatShading: true })
    )
    walls.position.y = 1.0
    walls.castShadow = true
    walls.receiveShadow = true
    g.add(walls)
    // 人字形屋顶
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, flatShading: true })
    )
    roof.position.y = 2.75
    roof.rotation.y = Math.PI / 4
    roof.scale.set(1, 1, 0.82)
    roof.castShadow = true
    g.add(roof)
    // 门
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6b4423, flatShading: true })
    )
    door.position.set(0, 0.6, 1.32)
    g.add(door)
    // 窗户（夜晚会亮灯）
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xbfe3ff,
      flatShading: true,
      emissive: 0xffd98a,
      emissiveIntensity: 0,
    })
    lanternGlowMats.push(winMat)
    for (const s of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), winMat)
      win.position.set(s * 1.0, 1.25, 1.32)
      g.add(win)
    }
    // 烟囱
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.9, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8d8578, flatShading: true })
    )
    chimney.position.set(0.9, 2.9, -0.5)
    chimney.castShadow = true
    g.add(chimney)
    g.position.set(x, terrainHeight(x, z), z)
    g.rotation.y = rotY
    scene.add(g)
  }

  // 木桌 + 凳子
  function makeTableSet(x: number, z: number, rotY: number) {
    const g = new THREE.Group()
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 10), woodMat)
    top.position.y = 0.72
    top.castShadow = true
    g.add(top)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 6), woodDark)
    leg.position.y = 0.36
    g.add(leg)
    // 桌上摆一盘黑巧克力（三块深浅不一的巧克力方块）
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.2, 0.07, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, flatShading: true })
    )
    plate.position.y = 0.81
    g.add(plate)
    const chocoColors = [0x2e1a10, 0x3b2317, 0x271409]
    for (let i = 0; i < 3; i++) {
      const choco = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshStandardMaterial({ color: chocoColors[i], roughness: 0.3, metalness: 0.05, flatShading: true })
      )
      const a = (i / 3) * Math.PI * 2
      choco.position.set(Math.cos(a) * 0.12, 0.92, Math.sin(a) * 0.12)
      choco.rotation.y = Math.random() * Math.PI
      g.add(choco)
    }
    // 三条凳子
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5
      const stool = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8), woodMat)
      seat.position.y = 0.42
      seat.castShadow = true
      stool.add(seat)
      const sleg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6), woodDark)
      sleg.position.y = 0.2
      stool.add(sleg)
      stool.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35)
      g.add(stool)
    }
    g.position.set(x, terrainHeight(x, z), z)
    g.rotation.y = rotY
    scene.add(g)
  }

  // 篝火（夜晚闪烁）
  let fireLight: THREE.PointLight
  let fireMesh: THREE.Mesh
  function makeCampfire(x: number, z: number) {
    const g = new THREE.Group()
    // 石头圈
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stoneMat)
      stone.position.set(Math.cos(a) * 0.65, 0.08, Math.sin(a) * 0.65)
      stone.rotation.set(Math.random(), Math.random(), 0)
      g.add(stone)
    }
    // 木柴
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), woodDark)
      log.rotation.z = Math.PI / 2.2
      log.rotation.y = (i / 3) * Math.PI * 2
      log.position.y = 0.15
      g.add(log)
    }
    // 火焰
    fireMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.7, 7),
      new THREE.MeshStandardMaterial({
        color: 0xff8c2e,
        emissive: 0xff6a00,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.95,
        flatShading: true,
      })
    )
    fireMesh.position.y = 0.55
    g.add(fireMesh)
    fireLight = new THREE.PointLight(0xff9a3d, 0, 12)
    fireLight.position.set(0, 1.2, 0)
    g.add(fireLight)
    g.position.set(x, terrainHeight(x, z), z)
    scene.add(g)
  }

  // 伸向海里的木码头
  function makeDock(x: number, z: number, rotY: number) {
    const g = new THREE.Group()
    const deckMat = woodMat
    for (let i = 0; i < 6; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.65), deckMat)
      plank.position.set(0, 0.55, i * 0.75)
      plank.castShadow = true
      g.add(plank)
    }
    for (const s of [-0.7, 0.7]) {
      for (let i = 0; i < 3; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), woodDark)
        post.position.set(s, 0, i * 1.5 + 0.2)
        g.add(post)
      }
    }
    g.position.set(x, 0, z)
    g.rotation.y = rotY
    scene.add(g)
  }

  // 木桶 / 木箱
  function makeBarrel(x: number, z: number) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.65, 10), woodMat)
    barrel.position.set(x, terrainHeight(x, z) + 0.33, z)
    barrel.castShadow = true
    scene.add(barrel)
  }
  function makeCrate(x: number, z: number, s: number) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), woodDark)
    crate.position.set(x, terrainHeight(x, z) + 0.3 * s, z)
    crate.scale.setScalar(s)
    crate.rotation.y = Math.random()
    crate.castShadow = true
    scene.add(crate)
  }

  // 栅栏
  function makeFence(x: number, z: number, rotY: number, len: number) {
    const g = new THREE.Group()
    const n = Math.floor(len / 0.9)
    for (let i = 0; i <= n; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.09), woodDark)
      post.position.set(i * 0.9 - len / 2, 0.37, 0)
      post.castShadow = true
      g.add(post)
    }
    for (const y of [0.3, 0.58]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.05), woodMat)
      rail.position.y = y
      g.add(rail)
    }
    g.position.set(x, terrainHeight(x, z), z)
    g.rotation.y = rotY
    scene.add(g)
  }

  // 路灯（夜晚发光）
  function makeLantern(x: number, z: number) {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), woodDark)
    pole.position.y = 0.9
    pole.castShadow = true
    g.add(pole)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfff2c8,
      flatShading: true,
      emissive: 0xffc95e,
      emissiveIntensity: 0,
    })
    lanternGlowMats.push(glowMat)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glowMat)
    lamp.position.y = 1.95
    g.add(lamp)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 8), woodDark)
    cap.position.y = 2.12
    g.add(cap)
    const light = new THREE.PointLight(0xffc95e, 0, 8)
    light.position.y = 1.95
    g.add(light)
    lanternLights.push(light)
    g.position.set(x, terrainHeight(x, z), z)
    scene.add(g)
  }

  // 花丛
  function makeFlower(x: number, z: number, color: number) {
    const g = new THREE.Group()
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5),
      new THREE.MeshStandardMaterial({ color: 0x3d9950, flatShading: true })
    )
    stem.position.y = 0.15
    g.add(stem)
    const bloom = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.09, 0),
      new THREE.MeshStandardMaterial({ color, flatShading: true })
    )
    bloom.position.y = 0.34
    g.add(bloom)
    g.position.set(x, terrainHeight(x, z), z)
    scene.add(g)
  }

  // ── 村落布局 ──
  const TABLE_X = 1.5
  const TABLE_Z = -6.5
  makeHouse(-7.5, -5, 0.5, 0xf2e3c6, 0xd95f43) // 红顶小屋
  makeTableSet(TABLE_X, TABLE_Z, 0.3)          // 野餐桌
  makeCampfire(-1, 6.5)
  makeDock(0, 22, Math.PI)                      // 南边码头伸向大海
  makeLantern(-4.2, -2)
  makeLantern(4.6, -3.5)
  makeLantern(0.6, 4.2)
  makeFence(-9.8, -2.5, 1.1, 4.5)
  makeFence(9.4, -5.5, -1.9, 3.6)
  makeBarrel(-5.6, -6.8)
  makeBarrel(-5.0, -6.2)
  makeCrate(8.6, -6.3, 1)
  makeCrate(8.2, -5.4, 0.75)
  makeCrate(-0.8, 21.4, 0.9) // 码头口放一个
  const flowerColors = [0xff6fa5, 0xffd166, 0xff8c69, 0xc490f0, 0xffffff]
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(4, 19)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (terrainHeight(x, z) > 0.35)
      makeFlower(x, z, flowerColors[Math.floor(Math.random() * flowerColors.length)])
  }

  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(4, 17)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (terrainHeight(x, z) > 0.3) makeTree(x, z)
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(18, 21.5)
    makePalm(Math.cos(a) * r, Math.sin(a) * r)
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2
    const r = rand(6, 20)
    makeRock(Math.cos(a) * r, Math.sin(a) * r)
  }

  // 云
  const clouds: THREE.Group[] = []
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    flatShading: true,
    transparent: true,
    opacity: 0.9,
  })
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group()
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.2, 2.4), 0), cloudMat)
      puff.position.set(j * 1.6 - 1.6, rand(-0.2, 0.4), rand(-0.5, 0.5))
      g.add(puff)
    }
    g.position.set(rand(-60, 60), rand(12, 18), rand(-60, 60))
    scene.add(g)
    clouds.push(g)
  }

  // ---------- 雨 ----------
  const RAIN_COUNT = 900
  const rainGeo = new THREE.BufferGeometry()
  const rainPos = new Float32Array(RAIN_COUNT * 3)
  const rainVel = new Float32Array(RAIN_COUNT)
  const RAIN_AREA = 30
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3] = rand(-RAIN_AREA, RAIN_AREA)
    rainPos[i * 3 + 1] = rand(0, 25)
    rainPos[i * 3 + 2] = rand(-RAIN_AREA, RAIN_AREA)
    rainVel[i] = rand(18, 26)
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
  const rainMat = new THREE.PointsMaterial({
    color: 0xa8c8e8,
    size: 0.14,
    transparent: true,
    opacity: 0,
  })
  const rain = new THREE.Points(rainGeo, rainMat)
  scene.add(rain)

  // ---------- 小黄鸭一家 ----------
  // 妈妈鸭（玩家）
  const mom = makeDuck(1.0, 'bow')
  const player = mom.group
  player.position.set(0, terrainHeight(0, 0), 0)
  scene.add(player)

  // 爸爸鸭（在沙滩附近悠闲散步）
  const dad = makeDuck(1.2, 'hat')
  dad.group.position.set(8, terrainHeight(8, 6), 6)
  scene.add(dad.group)
  const dadState = { tx: 8, tz: 6, wait: 0, phase: 0, moving: false }

  // 鸭宝宝（会跟着妈妈跑）
  const baby = makeDuck(0.5, 'none')
  baby.group.position.set(-3, terrainHeight(-3, 2), 2)
  scene.add(baby.group)
  const babyState = { phase: 0 }

  // 小绵羊（一半概率来岛上做客，在草地上悠闲散步，走累了低头吃草）
  const sheep = Math.random() < 0.5 ? makeSheep() : null
  if (sheep) {
    sheep.group.position.set(-8, terrainHeight(-8, 8), 8)
    scene.add(sheep.group)
  }
  const sheepState = { tx: -8, tz: 8, wait: 1, phase: 0, moving: false, graze: 0 }

  // ---------- 输入 ----------
  const keys = new Set<string>()
  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
      e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // 鼠标拖拽环绕视角
  let camAngle = Math.PI * 0.25
  let camPitch = 0.42
  let dragging = false
  let lastX = 0
  let lastY = 0
  const onDown = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    camAngle -= (e.clientX - lastX) * 0.006
    camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - lastY) * 0.004, 0.1, 1.2)
    lastX = e.clientX
    lastY = e.clientY
  }
  const onUp = () => (dragging = false)
  renderer.domElement.style.touchAction = 'none' // 防止触屏拖动时页面滚动
  renderer.domElement.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)

  // ---------- 虚拟摇杆（电脑和手机都显示） ----------
  const joy = { x: 0, y: 0 } // 屏幕坐标：x 右为正，y 下为正
  let joyBase: HTMLDivElement | null = null
  {
    joyBase = document.createElement('div')
    joyBase.style.cssText =
      'position:absolute;left:24px;bottom:24px;width:120px;height:120px;border-radius:50%;' +
      'background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.35);' +
      'backdrop-filter:blur(4px);touch-action:none;z-index:10;'
    const joyThumb = document.createElement('div')
    joyThumb.style.cssText =
      'position:absolute;left:50%;top:50%;width:52px;height:52px;border-radius:50%;' +
      'background:rgba(255,255,255,0.75);transform:translate(-50%,-50%);pointer-events:none;'
    joyBase.appendChild(joyThumb)
    container.appendChild(joyBase)

    const JOY_R = 40
    let joyPointerId: number | null = null
    const updateJoy = (e: PointerEvent) => {
      if (!joyBase) return
      const rect = joyBase.getBoundingClientRect()
      let dx = e.clientX - (rect.left + rect.width / 2)
      let dy = e.clientY - (rect.top + rect.height / 2)
      const len = Math.hypot(dx, dy)
      if (len > JOY_R) {
        dx = (dx / len) * JOY_R
        dy = (dy / len) * JOY_R
      }
      joy.x = dx / JOY_R
      joy.y = dy / JOY_R
      joyThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
    joyBase.addEventListener('pointerdown', (e) => {
      joyPointerId = e.pointerId
      joyBase!.setPointerCapture(e.pointerId)
      updateJoy(e)
      e.stopPropagation()
    })
    joyBase.addEventListener('pointermove', (e) => {
      if (e.pointerId === joyPointerId) updateJoy(e)
    })
    const joyEnd = (e: PointerEvent) => {
      if (e.pointerId !== joyPointerId) return
      joyPointerId = null
      joy.x = 0
      joy.y = 0
      joyThumb.style.transform = 'translate(-50%,-50%)'
    }
    joyBase.addEventListener('pointerup', joyEnd)
    joyBase.addEventListener('pointercancel', joyEnd)
  }

  // 黑巧克力提示标签：妈妈鸭靠近野餐桌时显示
  const tip = document.createElement('div')
  tip.textContent = '黑巧克力'
  tip.style.cssText =
    'position:absolute;transform:translate(-50%,-100%);padding:4px 10px;border-radius:10px;' +
    'background:rgba(0,0,0,0.45);color:#fff;font-size:12px;white-space:nowrap;' +
    'pointer-events:none;opacity:0;transition:opacity 0.3s;z-index:10;'
  container.appendChild(tip)
  const tipPos = new THREE.Vector3()

  // ---------- 日夜 & 天气常量 ----------
  const DAY_LENGTH = 120 // 一昼夜 120 秒
  let dayTime = DAY_LENGTH * 0.3 // 从上午开始

  const skyDay = new THREE.Color(0x8fd3f4)
  const skySunset = new THREE.Color(0xff9a5a)
  const skyNight = new THREE.Color(0x0b1026)
  const skyRain = new THREE.Color(0x6e8291)
  const tmpColor = new THREE.Color()

  // 天气状态机
  type Weather = 'sunny' | 'cloudy' | 'rain'
  let weather: Weather = 'sunny'
  let weatherTimer = 35 // 当前天气剩余秒数
  let rainStrength = 0 // 0..1 平滑过渡
  let cloudDark = 0 // 云变灰程度

  // ---------- 工具函数 ----------
  const ISLAND_R = 22.6

  function clampToIsland(p: THREE.Vector3) {
    const r = Math.hypot(p.x, p.z)
    if (r > ISLAND_R) {
      p.x = (p.x / r) * ISLAND_R
      p.z = (p.z / r) * ISLAND_R
    }
  }

  function faceToward(obj: THREE.Object3D, dx: number, dz: number, dt: number, speed = 12) {
    const targetRot = Math.atan2(dx, dz)
    let diff = targetRot - obj.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    obj.rotation.y += diff * Math.min(dt * speed, 1)
  }

  // 鸭子走路的摇摆动画
  function waddle(parts: DuckParts, phase: number, moving: boolean, t: number) {
    const s = moving ? Math.sin(phase) : 0
    parts.group.rotation.z = s * 0.09 // 左右摇摆
    parts.wingL.rotation.z = moving ? 0.25 + Math.abs(s) * 0.35 : 0.15 + Math.sin(t * 2) * 0.05
    parts.wingR.rotation.z = moving ? -0.25 - Math.abs(s) * 0.35 : -0.15 - Math.sin(t * 2) * 0.05
    parts.head.position.y = 1.12 + (moving ? Math.abs(Math.sin(phase)) * 0.04 : Math.sin(t * 2.2) * 0.015)
  }

  // ---------- 主循环 ----------
  const clock = new THREE.Clock()
  const SPEED = 5.2
  let walkPhase = 0
  let raf = 0

  function animate() {
    raf = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime

    // ===== 日夜交替 =====
    dayTime = (dayTime + dt) % DAY_LENGTH
    const dayFrac = dayTime / DAY_LENGTH // 0=午夜 0.5=正午
    const sunAngle = (dayFrac - 0.25) * Math.PI * 2 // 0.25 日出
    const sunElev = Math.sin(sunAngle) // -1..1
    const daylight = THREE.MathUtils.clamp(sunElev * 2 + 0.3, 0, 1)

    // 太阳/月亮位置（绕场景转）
    const orbitR = 90
    sunMesh.position.set(Math.cos(sunAngle) * orbitR, sunElev * orbitR, 40)
    moonMesh.position.set(-Math.cos(sunAngle) * orbitR, -sunElev * orbitR, -40)

    // 天空颜色：夜晚 → 日出 → 白天 → 日落 → 夜晚
    if (sunElev > 0.25) tmpColor.copy(skyDay)
    else if (sunElev > -0.15) {
      const k = (sunElev + 0.15) / 0.4
      tmpColor.copy(skySunset).lerp(skyDay, k)
    } else {
      const k = THREE.MathUtils.clamp((-sunElev - 0.15) / 0.35, 0, 1)
      tmpColor.copy(skySunset).lerp(skyNight, k)
    }
    // 雨天压暗天空
    tmpColor.lerp(skyRain, rainStrength * daylight * 0.75)
    scene.background = tmpColor
    fog.color.copy(tmpColor)

    // 光照随时间
    sun.intensity = 0.15 + daylight * 1.5 * (1 - rainStrength * 0.6)
    sun.color.setHSL(0.11, daylight > 0.4 ? 0.35 : 0.8, daylight > 0.4 ? 0.92 : 0.62)
    sun.position.copy(sunMesh.position).normalize().multiplyScalar(50)
    if (sunElev < -0.05) {
      // 夜晚用月光
      sun.position.copy(moonMesh.position).normalize().multiplyScalar(50)
      sun.intensity = 0.25
      sun.color.set(0xbdc8ff)
    }
    sun.target.position.set(0, 0, 0)
    hemi.intensity = 0.15 + daylight * 0.6 * (1 - rainStrength * 0.4)
    starMat.opacity = THREE.MathUtils.clamp(-sunElev * 2.2, 0, 0.95) * (1 - rainStrength)

    // ===== 夜晚灯火：窗户 / 路灯亮起，篝火闪烁 =====
    const nightness = THREE.MathUtils.clamp(-sunElev * 3 + 0.4, 0, 1)
    for (const m of lanternGlowMats) m.emissiveIntensity = nightness * 1.4
    for (const l of lanternLights) l.intensity = nightness * 1.6
    const flicker = 0.8 + Math.sin(t * 13) * 0.15 + Math.sin(t * 29) * 0.1
    fireLight.intensity = (0.4 + nightness * 1.8) * flicker
    fireMesh.scale.set(1, flicker, 1)
    fireMesh.rotation.y = t * 2

    // ===== 流星雨：只在晴朗的夜晚出现 =====
    const meteorActive = nightness > 0.6 && rainStrength < 0.3
    meteorTimer -= dt
    if (meteorActive && meteorTimer <= 0) {
      const m = meteors.find((mm) => !mm.mesh.visible)
      if (m) {
        // 从高空随机位置斜向划过
        const a = Math.random() * Math.PI * 2
        m.mesh.position.set(Math.cos(a) * rand(60, 120), rand(45, 80), Math.sin(a) * rand(60, 120))
        m.vel.set(rand(-1, 1), rand(-0.55, -0.3), rand(-1, 1)).normalize().multiplyScalar(rand(45, 75))
        m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.vel.clone().normalize())
        m.life = 0
        m.maxLife = rand(1.0, 1.8)
        m.mesh.visible = true
      }
      meteorTimer = rand(1.2, 4) // 下一颗
    }
    for (const m of meteors) {
      if (!m.mesh.visible) continue
      m.life += dt
      if (m.life >= m.maxLife) {
        m.mesh.visible = false
        continue
      }
      m.mesh.position.addScaledVector(m.vel, dt)
      const k = m.life / m.maxLife
      ;(m.mesh.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(k * Math.PI) * 0.95 // 淡入淡出
    }

    // ===== 天气系统 =====
    weatherTimer -= dt
    if (weatherTimer <= 0) {
      if (weather === 'sunny') {
        weather = 'cloudy'
        weatherTimer = 14
      } else if (weather === 'cloudy') {
        // 多云后转晴或下雨
        if (Math.random() < 0.55) {
          weather = 'rain'
          weatherTimer = rand(14, 22)
        } else {
          weather = 'sunny'
          weatherTimer = rand(28, 45)
        }
      } else {
        weather = 'sunny'
        weatherTimer = rand(28, 45)
      }
    }
    const targetRain = weather === 'rain' ? 1 : 0
    const targetCloud = weather === 'sunny' ? 0 : weather === 'cloudy' ? 0.45 : 1
    rainStrength += (targetRain - rainStrength) * Math.min(dt * 1.5, 1)
    cloudDark += (targetCloud - cloudDark) * Math.min(dt * 1.5, 1)

    // 云变色 & 压低
    cloudMat.color.setScalar(THREE.MathUtils.lerp(1, 0.45, cloudDark))
    cloudMat.opacity = 0.9
    for (const c of clouds) {
      c.position.x += dt * (0.6 + rainStrength * 1.2)
      if (c.position.x > 70) c.position.x = -70
    }

    // 雨滴下落（跟随玩家周围）
    rainMat.opacity = rainStrength * 0.85
    if (rainStrength > 0.02) {
      const px = player.position.x
      const pz = player.position.z
      for (let i = 0; i < RAIN_COUNT; i++) {
        let y = rainPos[i * 3 + 1] - rainVel[i] * dt
        if (y < 0) {
          y = rand(18, 25)
          rainPos[i * 3] = px + rand(-RAIN_AREA, RAIN_AREA)
          rainPos[i * 3 + 2] = pz + rand(-RAIN_AREA, RAIN_AREA)
        }
        rainPos[i * 3 + 1] = y
      }
      rainGeo.attributes.position.needsUpdate = true
    }

    // ===== 妈妈鸭（玩家）移动 =====
    let ix = 0
    let iz = 0
    if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1
    // 合并手机摇杆输入（摇杆向上推 = 屏幕前方 = iz 负方向）
    ix += joy.x
    iz += joy.y
    const moving = ix !== 0 || iz !== 0
    if (moving) {
      const len = Math.hypot(ix, iz)
      ix /= len
      iz /= len
      const sin = Math.sin(camAngle)
      const cos = Math.cos(camAngle)
      // 相机朝向的前方 = (-sin, -cos)，右方 = (cos, -sin)
      // W(iz=-1) 朝屏幕前方，D(ix=+1) 朝屏幕右方
      const dx = ix * cos + iz * sin
      const dz = -ix * sin + iz * cos
      player.position.x += dx * SPEED * dt
      player.position.z += dz * SPEED * dt
      clampToIsland(player.position)
      faceToward(player, dx, dz, dt)
      walkPhase += dt * 10
    } else {
      walkPhase *= 1 - Math.min(dt * 8, 1)
    }
    player.position.y = terrainHeight(player.position.x, player.position.z)
    waddle(mom, walkPhase, moving, t)

    // ===== 爸爸鸭：随机散步 =====
    if (dadState.wait > 0) {
      dadState.wait -= dt
      dadState.moving = false
    } else {
      const dx = dadState.tx - dad.group.position.x
      const dz = dadState.tz - dad.group.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.3) {
        // 到了，歇一会儿再选下一个目的地
        dadState.wait = rand(2, 6)
        const a = Math.random() * Math.PI * 2
        const r = rand(6, 19)
        dadState.tx = Math.cos(a) * r
        dadState.tz = Math.sin(a) * r
        dadState.moving = false
      } else {
        dadState.moving = true
        const sp = 2.2
        dad.group.position.x += (dx / dist) * sp * dt
        dad.group.position.z += (dz / dist) * sp * dt
        faceToward(dad.group, dx, dz, dt, 6)
        dadState.phase += dt * 8
      }
    }
    dad.group.position.y = terrainHeight(dad.group.position.x, dad.group.position.z)
    waddle(dad, dadState.phase, dadState.moving, t + 1)

    // ===== 小绵羊：草地散步，停下吃草 =====
    if (sheep) {
      if (sheepState.wait > 0) {
        sheepState.wait -= dt
        sheepState.moving = false
        // 歇着的时候低头吃草
        sheepState.graze = Math.min(sheepState.graze + dt * 2, 1)
      } else {
        const sdx = sheepState.tx - sheep.group.position.x
        const sdz = sheepState.tz - sheep.group.position.z
        const sdist = Math.hypot(sdx, sdz)
        if (sdist < 0.3) {
          // 到了，吃一会儿草再选下一个目的地（只在草地上挑）
          sheepState.wait = rand(3, 8)
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2
            const r = rand(4, 17)
            const gx = Math.cos(a) * r
            const gz = Math.sin(a) * r
            if (terrainHeight(gx, gz) > 0.35) {
              sheepState.tx = gx
              sheepState.tz = gz
              break
            }
          }
          sheepState.moving = false
        } else {
          sheepState.moving = true
          sheepState.graze = Math.max(sheepState.graze - dt * 3, 0)
          const sp = 1.6
          sheep.group.position.x += (sdx / sdist) * sp * dt
          sheep.group.position.z += (sdz / sdist) * sp * dt
          faceToward(sheep.group, sdx, sdz, dt, 5)
          sheepState.phase += dt * 6
        }
      }
      sheep.group.position.y = terrainHeight(sheep.group.position.x, sheep.group.position.z)
      // 对角小跑：左后+右前一条腿，左前+右后一条腿交替摆动
      const legSwing = sheepState.moving ? Math.sin(sheepState.phase) * 0.5 : 0
      sheep.legs[0].rotation.x = legSwing
      sheep.legs[1].rotation.x = -legSwing
      sheep.legs[2].rotation.x = -legSwing
      sheep.legs[3].rotation.x = legSwing
      if (sheepState.moving) {
        // 走路时身体轻微起伏
        sheep.group.position.y += Math.abs(Math.sin(sheepState.phase)) * 0.03
      }
      // 吃草低头 / 抬头恢复
      sheep.head.rotation.x = sheepState.graze * 0.9
      sheep.head.position.y = 0.84 - sheepState.graze * 0.18
    }

    // ===== 鸭宝宝：跟着妈妈 =====
    const bdx = player.position.x - baby.group.position.x
    const bdz = player.position.z - baby.group.position.z
    const bdist = Math.hypot(bdx, bdz)
    let babyMoving = false
    if (bdist > 2.2) {
      // 离妈妈远了就吧嗒吧嗒追上去（宝宝腿短，但加速追）
      const sp = bdist > 6 ? 5.6 : 3.2
      baby.group.position.x += (bdx / bdist) * sp * dt
      baby.group.position.z += (bdz / bdist) * sp * dt
      faceToward(baby.group, bdx, bdz, dt, 10)
      babyState.phase += dt * 16 // 小脚倒腾得飞快
      babyMoving = true
    }
    baby.group.position.y = terrainHeight(baby.group.position.x, baby.group.position.z)
    waddle(baby, babyState.phase, babyMoving, t + 2)

    // ===== 相机跟随 =====
    const camDist = 8.5
    const cx = player.position.x + Math.sin(camAngle) * Math.cos(camPitch) * camDist
    const cz = player.position.z + Math.cos(camAngle) * Math.cos(camPitch) * camDist
    const cy = player.position.y + Math.sin(camPitch) * camDist + 1
    camera.position.lerp(new THREE.Vector3(cx, Math.max(cy, 1.5), cz), Math.min(dt * 5, 1))
    camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z)

    // ===== 靠近野餐桌时提示黑巧克力 =====
    const tdist = Math.hypot(player.position.x - TABLE_X, player.position.z - TABLE_Z)
    if (tdist < 3) {
      tip.style.opacity = '1'
      tipPos.set(TABLE_X, terrainHeight(TABLE_X, TABLE_Z) + 1.6, TABLE_Z).project(camera)
      tip.style.left = `${(tipPos.x * 0.5 + 0.5) * container.clientWidth}px`
      tip.style.top = `${(-tipPos.y * 0.5 + 0.5) * container.clientHeight}px`
    } else {
      tip.style.opacity = '0'
    }

    // ===== 海面波浪：近岸碎波 + 绕岛涌来的长浪（下雨时浪更大）=====
    const waveAmp = 1 + rainStrength * 1.2
    for (let i = 0; i < waterPos.count; i++) {
      const x = waterBase[i * 3]
      const z = waterBase[i * 3 + 2]
      // 近岸细碎的小波浪
      const chop =
        (Math.sin(x * 0.25 + t * 1.4) * 0.18 + Math.cos(z * 0.22 + t) * 0.15) * waveAmp
      // 远处涌来的长浪：一圈圈推向小岛，靠近岸边逐渐显现
      const r = Math.hypot(x, z)
      const swell =
        Math.sin(r * 0.28 - t * 1.1) * 0.35 * Math.min(r / 25, 1) * (1 + rainStrength * 0.5)
      waterPos.setY(i, chop + swell - 0.12)
    }
    waterPos.needsUpdate = true
    waterGeo.computeVertexNormals()

    renderer.render(scene, camera)
  }
  animate()

  // ---------- 尺寸自适应 ----------
  const onResize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  const ro = new ResizeObserver(onResize)
  ro.observe(container)

  return {
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.dispose()
      if (joyBase && joyBase.parentElement === container) container.removeChild(joyBase)
      if (tip.parentElement === container) container.removeChild(tip)
      container.removeChild(renderer.domElement)
    },
  }
}
