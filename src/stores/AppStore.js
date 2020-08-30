import { types, getEnv } from "mobx-state-tree";

import CompletionStore from "./CompletionStore";
import Hotkey from "../core/Hotkey";
import InfoModal from "../components/Infomodal/Infomodal";
import Project from "./ProjectStore";
import Settings from "./SettingsStore";
import Task from "./TaskStore";
import User from "./UserStore";
import Utils from "../utils";

export default types
  .model("AppStore", {
    /**
     * XML config
     */
    config: types.string,

    /**
     * Task with data, id and project
     */
    task: types.maybeNull(Task),

    project: types.maybeNull(Project),

    /**
     * Configure the visual UI shown to the user
     */
    interfaces: types.array(types.string),

    /**
     * Flag for labeling of tasks
     */
    explore: types.optional(types.boolean, false),

    /**
     * Completions Store
     */
    completionStore: types.optional(CompletionStore, {
      completions: [],
      predictions: [],
    }),

    /**
     * User of Label Studio
     */
    user: types.maybeNull(User),

    /**
     * Debug for development environment
     */
    debug: types.optional(types.boolean, true),

    /**
     * Settings of Label Studio
     */
    settings: types.optional(Settings, {}),

    /**
     * Data of description flag
     */
    description: types.maybeNull(types.string),
    // apiCalls: types.optional(types.boolean, true),

    /**
     * Flag for settings
     */
    showingSettings: types.optional(types.boolean, false),
    /**
     * Flag
     * Description of task in Label Studio
     */
    showingDescription: types.optional(types.boolean, false),
    /**
     * Loading of Label Studio
     */
    isLoading: types.optional(types.boolean, false),
    /**
     * Flag for disable task in Label Studio
     */
    noTask: types.optional(types.boolean, false),
    /**
     * Flag for no access to specific task
     */
    noAccess: types.optional(types.boolean, false),
    /**
     * Finish of labeling
     */
    labeledSuccess: types.optional(types.boolean, false),
  })
  .views(self => ({
    /**
     * Get alert
     */
    get alert() {
      return getEnv(self).alert;
    },
  }))
  .actions(self => {
    /**
     * Update settings display state
     */
    function toggleSettings() {
      self.showingSettings = !self.showingSettings;
    }

    /**
     * Update description display state
     */
    function toggleDescription() {
      self.showingDescription = !self.showingDescription;
    }

    function setFlags(flags) {
      const names = ["showingSettings", "showingDescription", "isLoading", "noTask", "noAccess", "labeledSuccess"];

      for (let n of names) if (n in flags) self[n] = flags[n];
    }

    /**
     * Check for interfaces
     * @param {string} name
     * @returns {string | undefined}
     */
    function hasInterface(name) {
      return self.interfaces.find(i => name === i) !== undefined;
    }

    function addInterface(name) {
      return self.interfaces.push(name);
    }

    /**
     * Function
     */
    function afterCreate() {
      /**
       * Hotkey for submit
       */
      Hotkey.addKey("ctrl+enter", self.submitCompletion, "Submit a task");

      /**
       * Hotkey for skip task
       */
      if (self.hasInterface("skip")) Hotkey.addKey("ctrl+space", self.skipTask, "Skip a task");

      /**
       * Hotkey for update completion
       */
      if (self.hasInterface("update")) Hotkey.addKey("alt+enter", self.updateCompletion, "Update a task");

      /**
       * Hotkey for delete
       */
      Hotkey.addKey(
        "ctrl+backspace",
        function() {
          const { selected } = self.completionStore;
          selected.deleteAllRegions();
        },
        "Delete all regions",
      );

      // create relation
      Hotkey.addKey(
        "r",
        function() {
          const c = self.completionStore.selected;
          if (c && c.highlightedNode && !c.relationMode) {
            c.startRelationMode(c.highlightedNode);
          }
        },
        "Create relation when region is selected",
      );

      // unselect region
      Hotkey.addKey("u", function() {
        const c = self.completionStore.selected;
        if (c && c.highlightedNode && !c.relationMode) {
          c.regionStore.unselectAll();
        }
      });

      Hotkey.addKey("h", function() {
        const c = self.completionStore.selected;
        if (c && c.highlightedNode && !c.relationMode) {
          c.highlightedNode.toggleHidden();
        }
      });

      Hotkey.addKey("ctrl+z", function() {
        const { history } = self.completionStore.selected;
        history && history.canUndo && history.undo();
      });

      Hotkey.addKey(
        "escape",
        function() {
          const c = self.completionStore.selected;
          if (c && c.relationMode) {
            c.stopRelationMode();
          }
        },
        "Exit relation mode",
      );

      Hotkey.addKey(
        "backspace",
        function() {
          const c = self.completionStore.selected;
          if (c && c.highlightedNode) {
            c.highlightedNode.deleteRegion();
          }
        },
        "Delete selected region",
      );

      Hotkey.addKey(
        "alt+tab",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.selectNext();
        },
        "Circle through entities",
      );

      Hotkey.addKey(
        "a",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustSize("a");
        },
        "Decrease selected object width",
      );

      Hotkey.addKey(
        "d",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustSize("d");
        },
        "Increase selected object width",
      );

      Hotkey.addKey(
        "w",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustSize("w");
        },
        "Increase selected object height",
      );

      Hotkey.addKey(
        "s",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustSize("s");
        },
        "Decrease selected object height",
      );

      Hotkey.addKey(
        "ctrl+up",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustPos("up");
        },
        "Move selected object upward",
      );

      Hotkey.addKey(
        "ctrl+down",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustPos("down");
        },
        "Move selected object downward",
      );

      Hotkey.addKey(
        "ctrl+left",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustPos("left");
        },
        "Move selected object leftward",
      );

      Hotkey.addKey(
        "ctrl+right",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.adjustPos("right");
        },
        "Move selected object rightward",
      );

      Hotkey.addKey(
        "enter",
        function() {
          const c = self.completionStore.selected;
          c && c.regionStore.selectRightAdj();
        },
        "Select next object in right",
      );

      getEnv(self).onLabelStudioLoad(self);
    }

    /**
     *
     * @param {*} taskObject
     */
    function assignTask(taskObject) {
      if (taskObject && !Utils.Checkers.isString(taskObject.data)) {
        taskObject = {
          ...taskObject,
          [taskObject.data]: JSON.stringify(taskObject.data),
        };
      }
      self.task = Task.create(taskObject);
    }

    /* eslint-disable no-unused-vars */
    function showModal(message, type = "warning") {
      InfoModal[type](message);

      // InfoModal.warning("You need to label at least something!");
    }
    /* eslint-enable no-unused-vars */

    function submitCompletion() {
      const c = self.completionStore.selected;
      c.beforeSend();

      if (!c.validate()) return;

      c.sendUserGenerate();
      getEnv(self).onSubmitCompletion(self, c);
    }

    function updateCompletion() {
      const c = self.completionStore.selected;
      c.beforeSend();

      getEnv(self).onUpdateCompletion(self, c);
    }

    function skipTask() {
      getEnv(self).onSkipTask(self);
    }

    /**
     * Reset completion store
     */
    function resetState() {
      self.completionStore = CompletionStore.create({ completions: [] });

      // const c = self.completionStore.addInitialCompletion();

      // self.completionStore.selectCompletion(c.id);
    }

    /**
     * Function to initilaze completion store
     * Given completions and predictions
     */
    function initializeStore({ completions, predictions }) {
      const _init = (addFun, selectFun) => {
        return item => {
          const obj = self.completionStore[addFun](item);

          self.completionStore[selectFun](obj.id);
          obj.deserializeCompletion(item.result);
          obj.reinitHistory();

          return obj;
        };
      };

      const addPred = _init("addPrediction", "selectPrediction");
      const addComp = _init("addCompletion", "selectCompletion");

      predictions && predictions.forEach(p => addPred(p));
      completions && completions.forEach(c => addComp(c));
    }

    /** labels Filtering functions **/
    // Update regions(labels) visibility by the given score range
    function updateVisibility(interval) {
      const currCompletion = self.completionStore.selected;
      currCompletion.interval = interval;
      currCompletion.regionStore.labelVisible(interval);
    }

    // Update the mode of filtering labels (i.e. score/quartile)
    function updateFilterOpt(e) {
      const currCompletion = self.completionStore.selected;
      currCompletion.filterType = e.target.value;
      if (e.target.value === "Quantile") {
        currCompletion.selectedQ = [1, 1, 1, 1];
        currCompletion.regionStore.quartileVisible([1, 1, 1, 1]);
      } else if (e.target.value === "Score") {
        currCompletion.interval = [0, 100];
        currCompletion.regionStore.labelVisible([0, 100]);
      } else {
        currCompletion.regionStore.resetVisible();
      }
    }

    // Update regions(labels) visibility by the given selected Quartiles
    function updateQuartile(ind) {
      const currCompletion = self.completionStore.selected;
      let selectedQ = currCompletion.selectedQ;

      // logic to avoid 2 disjoint ranges
      if (selectedQ[ind] === 1) {
        // try to deselect quartile
        if (ind === 0 || ind === 3) selectedQ[ind] = 0;
        else {
          if (selectedQ[ind - 1] + selectedQ[ind + 1] === 2) {
            for (let i = ind; i < selectedQ.length; i++) selectedQ[i] = 0;
          } else {
            selectedQ[ind] = 0;
          }
        }
      } else {
        // try to select quartile
        let sum = 0;
        for (let i = 0; i < selectedQ.length; i++) sum += selectedQ[i];
        if (sum !== 0) {
          if (ind === 0 && selectedQ[1] !== 1) {
            for (let i = 0; i < selectedQ.length; i++) selectedQ[i] = 0;
          } else if (ind === 3 && selectedQ[2] !== 1) {
            for (let i = 0; i < selectedQ.length; i++) selectedQ[i] = 0;
          } else {
            if (!(selectedQ[ind - 1] === 1 || selectedQ[ind + 1] === 1)) {
              for (let i = 0; i < selectedQ.length; i++) selectedQ[i] = 0;
            }
          }
        }
        selectedQ[ind] = 1;
      }
      currCompletion.selectedQ = selectedQ;
      currCompletion.regionStore.quartileVisible(selectedQ);
    }

    function shiftBoxesColor(event) {
      const currCompletion = self.completionStore.selected;
      currCompletion.regionStore.shiftColor(event.target.checked);
    }

    function updateClass(event, item) {
      const currCompletion = self.completionStore.selected;
      currCompletion.regionStore.classVisible(event.target.checked, item.value);
    }

    function toggleDoubleCheck(event) {
      const currCompletion = self.completionStore.selected;
      currCompletion.doubleChecked = event.target.checked;
    }

    return {
      setFlags,
      addInterface,
      hasInterface,

      afterCreate,
      assignTask,
      resetState,
      initializeStore,

      skipTask,
      submitCompletion,
      updateCompletion,

      toggleSettings,
      toggleDescription,

      updateVisibility,
      updateFilterOpt,
      updateQuartile,
      updateClass,

      shiftBoxesColor,
      toggleDoubleCheck,
    };
  });
