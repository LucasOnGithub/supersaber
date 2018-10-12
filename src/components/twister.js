AFRAME.registerComponent('twister', {
  schema: {
    enabled: {default: false},
    twist: {default: 0},
    vertices: {default: 4, type: 'int'},
    count: {default: 20, type: 'int'},
    positionIncrement: {default: 2},
    radiusIncrement: {default: 0.5},
    thickness: {default: 0.4}
  },

  init: function () {
    this.currentTwist = 0;
    this.animate = false;
  },

  pulse: function (twist) {
    if (!this.data.enabled) { return; }
    if (twist == 0) { twist = 0.1 + Math.random() * 0.25; }
    else twist = Math.min(twist, 0.5);
    twist *= Math.random() < 0.5 ? -1 : 1; // random direction
    this.el.setAttribute('twister', {twist: twist});
  },

  update: function (oldData) {
    var radius = 4;
    var segment;
    var lastSegment;

    if (Math.abs(this.data.twist - this.currentTwist) > 0.001) {
      this.animate = true;
      return;
    }

    this.clearSegments();
    lastSegment = this.el.object3D;

    for (var i = 0; i < this.data.count; i++) {
      segment = this.createSegment(radius);
      segment.position.y = this.data.positionIncrement;
      lastSegment.add(segment);
      lastSegment = segment;
      radius += this.data.radiusIncrement;
    }
  },

  createSegment: function (radius) {
    const R = this.data.thickness;
    var points = [
      new THREE.Vector2(radius - R, R),
      new THREE.Vector2(radius - R, -R),
      new THREE.Vector2(radius + R, -R),
      new THREE.Vector2(radius + R, R),
      new THREE.Vector2(radius - R, R)
    ];
    var material = this.el.sceneEl.systems.materials.black;
    var geometry = new THREE.LatheBufferGeometry(points, this.data.vertices);
    var segment = new THREE.Mesh(geometry, material);
    return segment;
  },

  clearSegments: function () {
    this.el.object3D.remove(this.el.object3D.children[0]);
  },

  tick: function (time, delta) {
    if (!this.animate) { return; }
    if (Math.abs(this.data.twist - this.currentTwist) < 0.001) {
      this.animate = false;
    }

    this.currentTwist += (this.data.twist - this.currentTwist) * delta * 0.001;

    var child = this.el.object3D.children[0];
    while (child) {
      child.rotation.y = this.currentTwist;
      child = child.children[0];
    }
  }
});
