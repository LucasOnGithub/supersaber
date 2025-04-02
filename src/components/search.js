var bindEvent = require('aframe-event-decorators').bindEvent;

AFRAME.registerComponent('search', {
  init: function () {
    this.eventDetail = {query: '', results: []};
    this.popularHits = null;

    // Fetch popular songs on init.
    this.search('');

    this.el.sceneEl.addEventListener('searchclear', () => { this.search(''); });
  },

  superkeyboardchange: bindEvent(function (evt) {
    if (evt.target !== this.el) { return; }
    this.search(evt.detail.value);
  }),

  search: function (query) {
    const self = this;

    // Use cache for popular songs.
    if (!query && this.popularHits) {
      this.eventDetail.results = this.popularHits;
      this.eventDetail.query = '';
      this.el.sceneEl.emit('searchresults', this.eventDetail);
      return;
    }

    fetch(`https://api.beatsaver.com/search/text/0?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        const hits = data.docs.map((item, i) => ({
          objectID: item.id,
          title: item.name,
          author: item.uploader?.name || 'Unknown',
          coverURL: item.versions?.[0]?.coverURL || '',
          downloadURL: item.versions?.[0]?.downloadURL || '',
          index: i
        }));

        if (!query) { self.popularHits = hits; }

        self.eventDetail.query = query;
        self.eventDetail.results = hits;
        self.el.sceneEl.emit('searchresults', self.eventDetail);
      })
      .catch(err => {
        console.error('BeatSaver search failed:', err);
        self.el.sceneEl.emit('searcherror', null, false);
      });
  }
});

// Fallback genre search using manual filtering
AFRAME.registerComponent('search-genre', {
  init: function () {
    this.eventDetail = {isGenreSearch: true, genre: '', results: []};

    this.el.addEventListener('click', evt => {
      const genre = evt.target.closest('.genre').dataset.bindForKey;
      this.search(genre);
    });
  },

  search: function (genre) {
    const self = this;

    // No real genre filter on BeatSaver, emulate with query
    fetch(`https://api.beatsaver.com/search/text/0?q=${encodeURIComponent(genre)}`)
      .then(res => res.json())
      .then(data => {
        const hits = data.docs.map((item, i) => ({
          objectID: item.id,
          title: item.name,
          author: item.uploader?.name || 'Unknown',
          coverURL: item.versions?.[0]?.coverURL || '',
          downloadURL: item.versions?.[0]?.downloadURL || '',
          index: i
        }));

        self.eventDetail.genre = genre;
        self.eventDetail.results = hits;
        self.el.sceneEl.emit('searchresults', self.eventDetail);
      })
      .catch(err => {
        console.error('BeatSaver genre search failed:', err);
        self.el.sceneEl.emit('searcherror', null, false);
      });
  }
});

// The rest of your original components remain the same
AFRAME.registerComponent('search-result-list', {
  init: function () {
    const obv = new MutationObserver(mutations => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-index') {
          this.refreshLayout();
        }
      }
    });
    obv.observe(this.el, {attributes: true, childList: false, subtree: true});
  },

  refreshLayout: function () {
    this.el.emit('layoutrefresh', null, false);
  },

  click: bindEvent(function (evt) {
    this.el.sceneEl.emit('menuchallengeselect',
                         evt.target.closest('.searchResult').dataset.id,
                         false);
  })
});

AFRAME.registerComponent('search-song-name-selected', {
  schema: {
    anchor: {default: 0},
    index: {default: 0},
    offset: {default: 0},
    selectedChallengeId: {default: ''}
  },

  update: function () {
    const data = this.data;
    const el = this.el;
    el.object3D.visible = !!data.selectedChallengeId && data.index !== -1;
    el.object3D.position.y = data.index * data.offset + data.anchor;
  }
});
