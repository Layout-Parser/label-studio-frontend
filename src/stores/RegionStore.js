import { types, getParent, getEnv, onPatch } from "mobx-state-tree";

import Hotkey from "../core/Hotkey";
import { AllRegionsType } from "../regions";

export default types
  .model("RegionStore", {
    regions: types.array(types.safeReference(AllRegionsType)),

    sort: types.optional(types.enumeration(["date", "score"]), "date"),
    sortOrder: types.optional(types.enumeration(["asc", "desc"]), "desc"),

    group: types.optional(types.enumeration(["type", "label"]), "type"),

    colorMap: types.optional(types.map(types.string), {}),
    hasMap: types.optional(types.boolean, false),
  })
  .views(self => ({
    get sortedRegions() {
      const sorts = {
        date: () => self.regions,
        score: () => self.regions.sort((a, b) => a.score - b.score),
      };

      return sorts[self.sort]();
      // TODO
      // return (self.sortOrder === 'asc') ? r.slice().reverse() : r;
    },
  }))
  .actions(self => ({
    addRegion(region) {
      self.regions.push(region);
      getEnv(self).onEntityCreate(region);
    },

    toggleSortOrder() {
      if (self.sortOrder === "asc") self.sortOrder = "desc";
      else self.sortOrder = "asc";
    },

    setSort(sort) {
      self.sortOrder = "desc";
      self.sort = sort;
      self.initHotkeys();
    },

    setGroup(group) {
      self.group = group;
    },

    /**
     * Delete region
     * @param {obj} region
     */
    deleteRegion(region) {
      const arr = self.regions;

      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === region) {
          arr.splice(i, 1);
        }
      }

      getEnv(self).onEntityDelete(region);
      self.initHotkeys();
    },

    findRegion(pid) {
      return self.regions.find(r => r.pid === pid);
    },

    afterCreate() {
      onPatch(self, patch => {
        if ((patch.op === "add" || patch.op === "delete") && patch.path.indexOf("/regions/") !== -1) {
          self.initHotkeys();
        }
      });
    },

    // init Alt hotkeys for regions selection
    initHotkeys() {
      const PREFIX = "alt+shift+";
      const keys = Hotkey.getKeys();
      const rkeys = keys.filter(k => k.indexOf(PREFIX) !== -1);

      rkeys.forEach(k => Hotkey.removeKey(k));

      self.sortedRegions.forEach((r, n) => {
        Hotkey.addKey(PREFIX + (n + 1), function() {
          self.unselectAll();
          r.selectRegion();
        });
      });

      // this is added just for the reference to show up in the
      // settings page
      Hotkey.addKey("alt+shift+$n", () => {}, "Select a region");
    },

    /**
     * @param {boolean} tryToKeepStates try to keep states selected if such settings enabled
     */
    unselectAll(tryToKeepStates = false) {
      self.regions.forEach(r => r.unselectRegion(tryToKeepStates));
      getParent(self).setHighlightedNode(null);
    },

    unhighlightAll() {
      self.regions.forEach(r => r.setHighlight(false));
    },

    selectNext() {
      const { regions } = self;
      const idx = self.regions.findIndex(r => r.selected);
      idx !== -1 && regions[idx].unselectRegion();

      const next = regions[idx + 1] !== "undefined" ? regions[idx + 1] : regions[0];

      next && next.selectRegion();
    },

    // adjust size of selected object through w, a, s, d
    adjustSize(option) {
      const { regions } = self;
      const idx = self.regions.findIndex(r => r.selected);
      if (regions[idx] != undefined) {
        let x = regions[idx].x;
        let y = regions[idx].y;
        let w = regions[idx].width;
        let h = regions[idx].height;
        if (option === "w") {
          regions[idx].setPosition(x, y - 1, w, h + 1, 0);
        } else if (option === "s") {
          regions[idx].setPosition(x, y + 1, w, h - 1, 0);
        } else if (option === "d") {
          regions[idx].setPosition(x, y, w + 1, h, 0);
        } else {
          // option === 'a'
          regions[idx].setPosition(x, y, w - 1, h, 0);
        }
      }
    },

    // adjust size of selected object through w, a, s, d
    adjustPos(option) {
      const { regions } = self;
      const idx = self.regions.findIndex(r => r.selected);
      if (regions[idx] != undefined) {
        let x = regions[idx].x;
        let y = regions[idx].y;
        let w = regions[idx].width;
        let h = regions[idx].height;
        if (option === "up") {
          regions[idx].setPosition(x, y - 1, w, h, 0);
        } else if (option === "down") {
          regions[idx].setPosition(x, y + 1, w, h, 0);
        } else if (option === "left") {
          regions[idx].setPosition(x - 1, y, w, h, 0);
        } else {
          // option === 'right'
          regions[idx].setPosition(x + 1, y, w, h, 0);
        }
      }
    },

    // unselect current object, then select the right adjacent object
    selectRightAdj() {
      const { regions } = self;
      const idx = regions.findIndex(r => r.selected);
      if (idx === -1 || regions.length < 2) return;
      regions[idx].unselectRegion();

      let obs = [];
      for (let i = 0; i < regions.length; i++) {
        if (!regions.hidden) obs.push([i, regions[i].x, regions[i].id]);
      }

      obs.sort(function(ob1, ob2) {
        if (ob1[1] > ob2[1]) return 1;
        if (ob1[1] < ob2[1]) return -1;
        // minor sort
        if (ob1[2] > ob2[2]) return 1;
        else return -1;
      });

      let start = regions[obs[0][0]];
      let rightAdj = -1;

      let passCurr = false;
      for (let i = 0; i < obs.length; i++) {
        if (obs[i][0] === idx) {
          passCurr = true;
          continue;
        }
        if (!passCurr) continue;
        if (obs[i][1] >= regions[idx].x && obs[i][2] !== regions[idx].id) {
          rightAdj = regions[obs[i][0]];
          break;
        }
      }

      // O(n) algo, but messy logic

      // const currX = regions[idx].x;
      // let rightAdj = -1;
      // let rightDist = Number.MAX_VALUE;
      // let start = -1;
      // let minX = Number.MAX_VALUE;
      // for (let i = 0; i < regions.length; i++) {
      //   if (i !== idx && regions[i].x - currX >= 0 && regions[i].x - currX <= rightDist) {
      //     // pick the one with smaller id when x coords are the same
      //     if (regions[i].x - currX === rightDist && regions[i].id < rightAdj.id) {
      //       rightAdj = regions[i];
      //     } else { // regions[i].x - currX < rightDist
      //       if (regions[i].x - currX !== 0 || regions[i].id > regions[idx].id) {
      //         rightDist = regions[i].x - currX;
      //         rightAdj = regions[i];
      //       }
      //     }
      //   }
      //   if (regions[i].x <= minX) {
      //     if (regions[i].x === minX && regions[i].id < start.id) {
      //       start = regions[i];
      //     } else {
      //       minX = regions[i].x;
      //       start = regions[i];
      //     }
      //   }
      // }

      const next = rightAdj !== -1 ? rightAdj : start;
      next && next.selectRegion();
    },

    // boxes filtering function based on score
    labelVisible(scoreRange) {
      self.regions.forEach(r => {
        if (r.score < scoreRange[0] || r.score > scoreRange[1]) {
          r.hidden = true;
        } else {
          r.hidden = false;
        }
      });
    },

    // boxes filtering function based on quartile
    quartileVisible(selectedQ) {
      let start = -1;
      let len = 0;
      for (let i = 0; i < selectedQ.length; i++) {
        if (start === -1 && selectedQ[i] === 1) start = i;
        len += selectedQ[i];
      }

      let scores = [];
      self.regions.forEach(r => {
        scores.push(r.score);
      });

      let lower = -1;
      let upper = -1;
      if (scores.length > 0) {
        scores.sort(function(a, b) {
          return a - b;
        });
        lower = scores[Math.max(Math.ceil((start / 4) * self.regions.length), 0)];
        upper = scores[Math.max(Math.ceil(((start + len) / 4) * self.regions.length) - 1, 0)];
        if (start === -1) lower = scores[scores.length - 1] + 1;
      }

      self.regions.forEach(r => {
        if (r.score < lower || r.score > upper) {
          r.hidden = true;
        } else {
          r.hidden = false;
        }
      });
    },

    shiftColor(toBeFill) {
      if (toBeFill) {
        self.hasMap = true;
        self.regions.forEach(r => {
          self.colorMap[r.id] = r.fillColor;
          r.fillOpacity = 1;
          r.opacity = 1;
          r.fillColor = "#FF0000";
        });
      } else {
        self.regions.forEach(r => {
          if (self.colorMap[r.id] !== undefined) {
            r.fillOpacity = 0.6;
            r.opacity = 0.6;
            r.fillColor = self.colorMap[r.id];
          }
        });
        self.hasMap = false;
        self.colorMap.clear();
      }
    },
  }));
