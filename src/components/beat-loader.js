var utils = require('../utils');

/**
 * Load beat data (all the beats and such).
 */
AFRAME.registerComponent('beat-loader', {
  schema: {
    beatAnticipationTime: {default: 2.0},
    beatSpeed: {default: 4.0},
    challengeId: {type: 'string'},
    difficulty: {type: 'string'}
  },

  orientations: [180, 0, 270, 90, 225, 135, 315, 45, 0],
  horizontalPositions: [-0.60, -0.25, 0.25, 0.60],
  verticalPositions: [1.00, 1.35, 1.70],

  update: function () {
    if (!this.data.challengeId || !this.data.difficulty) { return; }
    this.loadBeats();
  },

  /**
   * XHR.
   */
  loadBeats: function () {
    var el = this.el;
    var xhr;

    // Load beats.
    let url = utils.getS3FileUrl(this.data.challengeId, `${this.data.difficulty}.json`);
    xhr = new XMLHttpRequest();
    el.emit('beatloaderstart');
    console.log(`Fetching ${url}...`);
    xhr.open('GET', url);
    xhr.addEventListener('load', () => {
      this.handleBeats(JSON.parse(xhr.responseText));
    });
    xhr.send();
  },

  /**
   * Load the beat data into the game.
   */
  handleBeats: function (beatData) {
    this.el.sceneEl.emit('beatloaderfinish', beatData, false);
    var lessThan = function (a, b) {
      return a._time - b._time;
    };
    this.beatData = beatData;
    this.beatData._obstacles.sort(lessThan);
    this.beatData._notes.sort(lessThan);
    console.log('Finished loading challenge data.');
  },

  tick: function (time, delta) {
    var audioEl = this.el.components.song.audio;
    var i;
    var notes;
    var obstacles;
    var lastTime = this.lastTime || 0;
    var msPerBeat;
    var noteTime;

    if (!this.data.challengeId || !this.beatData || !audioEl) { return; }

    notes = this.beatData._notes;
    obstacles = this.beatData._obstacles;
    this.bpm = this.beatData._beatsPerMinute;
    msPerBeat = 1000 * 60 / this.beatData._beatsPerMinute;
    for (i = 0; i < notes.length; ++i) {
      noteTime = notes[i]._time * msPerBeat;
      if (noteTime > lastTime && noteTime <= lastTime + delta) {
        notes[i].time = noteTime;
        this.generateBeat(notes[i]);
      }
    }

    for (i=0; i < obstacles.length; ++i) {
      noteTime = obstacles[i]._time * msPerBeat;
      if (noteTime > lastTime && noteTime <= lastTime + delta) {
        // this.generateWall(obstacles[i]);
      }
    }

    this.lastTime = lastTime + delta;

    // Sync audio with first element.
    if (this.audioSync || !this.first) { return; }
    if (this.first.el.object3D.position.z < this.el.sceneEl.camera.el.object3D.position.z) {
      return;
    }
    this.audioSync = true;
    this.el.components.song.audio.currentTime = this.first.time;
  },

  generateBeat: (function () {
    const beatObj = {};

    return function (noteInfo) {
      var color;
      var orientation;
      var el;
      var type = noteInfo._cutDirection === 8 ? 'dot' : 'arrow';
      color = noteInfo._type === 0 ? 'red' : 'blue';
      if (noteInfo._type === 3) {
        type = 'mine';
        color = undefined;
      }
      el = this.requestBeat(type, color);
      if (!el) { return; }

      beatObj.color = color;
      beatObj.type = type;
      beatObj.speed = this.data.beatSpeed;
      el.setAttribute('beat', beatObj);
      el.object3D.position.set(
        this.horizontalPositions[noteInfo._lineIndex],
        this.verticalPositions[noteInfo._lineLayer],
        -this.data.beatAnticipationTime * this.data.beatSpeed
      );
      el.object3D.rotation.z = THREE.Math.degToRad(this.orientations[noteInfo._cutDirection]);
      el.play();

      if (this.first) { return; }

      this.first = {
        el: el,
        time: noteInfo._time
      };
    };
  })(),

  // generateWall: function (wallInfo) {
  //   var el = this.el.sceneEl.components.pool__wall.requestEntity();
  //   var speed = this.data.beatSpeed;
  //   var durationMs;
  //   if (!el) { return; }
  //   durationSeconds = 60 * (wallInfo._duration / this.bpm);
  //   el.setAttribute('wall', {
  //     speed: speed
  //   });
  //   el.object3D.position.set(
  //     this.horizontalPositions[wallInfo._lineIndex],
  //     1.30,
  //     -(this.data.beatAnticipationTime * speed)
  //   );
  //   el.object3D.scale.set(wallInfo._width * 0.30, 2.5, durationSeconds * speed);
  //   el.play();
  //   if (this.first) { return; }
  //   this.first = {
  //     el: el,
  //     time: wallInfo._time
  //   };
  // },

  requestBeat: function (type, color) {
    var beatPoolName = 'pool__beat-' + type;
    var pool;
    if (color) {beatPoolName += '-' + color; }
    pool = this.el.sceneEl.components[beatPoolName];
    if (!pool) {
      console.warn('Poo ' + beatPoolName + ' unavailable');
      return;
    }
    return pool.requestEntity();
  }
});

function updateQueryParam(uri, key, value) {
  var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  var separator = uri.indexOf('?') !== -1 ? '&' : '?';
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + '=' + value + '$2');
  } else {
    return uri + separator + key + '=' + value;
  }
}
