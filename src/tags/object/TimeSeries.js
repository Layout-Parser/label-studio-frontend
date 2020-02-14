import "moment-duration-format";
import React, { Fragment } from "react";
import _ from "underscore";
import moment from "moment";
import { AreaChart, Brush, ChartContainer, ChartRow, Charts, styler } from "react-timeseries-charts";
import { Button, Icon } from "antd";
import { Slider } from "antd";
import { TimeSeries, TimeRange, avg, percentile, median } from "pondjs";
import { format } from "d3-format";
import { observer, inject } from "mobx-react";
import { types, getRoot, getType } from "mobx-state-tree";

import ObjectTag from "../../components/Tags/Object";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { TimeSeriesChannelModel, HtxTimeSeriesChannel } from "./TimeSeries/Channel";
import { TimeSeriesRegionModel } from "../../regions/TimeSeriesRegion";
import { cloneNode } from "../../core/Helpers";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";
import { runTemplate } from "../../core/Template";

const data = require("./bike.json");

/**
 * TimeSeries tag can be used to label time series data
 * @example
 * <View>
 *   <TimeSeries name="video" combineChannels="true">
 *      <TimeSeriesChannel value="$val" />
 *      <TimeSeriesChannel value="$val2" />
 *      <TimeSeriesOverview channel="0" />
 *   </TimeSeries>
 * </View>
 * @param {string} name of the element
 */

const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  multiaxis: types.optional(types.boolean, false), // show channels in the same view
  // visibilitycontrols: types.optional(types.boolean, false), // show channel visibility controls
  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model("TimeSeriesModel", {
    id: types.optional(types.identifier, guidGenerator),
    type: "timeseries",
    children: Types.unionArray(["timeserieschannel", "timeseriesoverview", "view"]),
    regions: types.array(TimeSeriesRegionModel),

    // _value: types.optional(types.string, ""),
    _needsUpdate: types.optional(types.number, 0),
  })
  .views(self => ({
    get regionsTimeRanges() {
      return self.regions.map(r => {
        return new TimeRange(r.start, r.end);
      });
    },

    get store() {
      return getRoot(self);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states ? states.filter(s => s.isSelected && getType(s).name === "TimeSeriesLabelsModel") : null;
    },
  }))

  .actions(self => ({
    updateView() {
      self._needsUpdate = self._needsUpdate + 1;
    },

    updateTR(tr) {
      self.initialRange = tr;
      self.brushRange = tr;
      self.updateView();
    },

    fromStateJSON(obj, fromModel) {
      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if ("timeserieslabels" in obj.value) {
        const states = restoreNewsnapshot(fromModel);
        states.fromStateJSON(obj);

        self.createRegion(obj.value.start, obj.value.end, [states]);

        self.updateView();
      }
    },

    updateValue(store) {
      console.log("updateValue");
      self._value = runTemplate(self.value, store.task.dataObj);
    },

    toStateJSON() {
      return self.regions.map(r => r.toStateJSON());
    },

    createRegion(start, end, states) {
      const r = TimeSeriesRegionModel.create({
        start: start,
        end: end,
        states: states,
      });

      self.regions.push(r);
      self.completion.addRegion(r);

      return r;
    },

    addRegion(start, end) {
      const states = self.activeStates();

      // do to net labeling happen when there were no labels selected
      if (!states.length) return;

      const clonedStates = states && states.map(s => cloneNode(s));
      const r = self.createRegion(start, end, clonedStates);

      states && states.forEach(s => s.unselectAll());

      return r;
    },

    regionChanged(timerange, i) {
      const r = self.regions[i];

      if (!r) {
        self.addRegion(timerange.begin().getTime(), timerange.end().getTime());
      } else {
        r.start = timerange.begin().getTime();
        r.end = timerange.end().getTime();
      }
    },

    afterAttach() {
      // console.log('afterAttach');
      // console.log(self.store);
      // window.A = self.store;
      // self._value = runTemplate(self.value, self.store.task.dataObj);
    },

    afterCreate() {
      //     console.log('afterCreate');
      //     self._value = runTemplate(self.value, self.store.task.dataObj);
      // const tr = new TimeRange(1000, 1000000);
      // self.initialRange = tr;
      // self.brushRange = tr;
      // const series = new TimeSeries({
      //   name: "time",
      //   columns: ["time"],
      //   points: self._value,
      // });
      // self.series = series;
    },

    updateValue(store) {
      self._value = runTemplate(self.value, store.task.dataObj, { raw: true });

      const points = self._value[0].map(t => t * 1000);

      // TODO need to figure out why this TS object is not
      // returning a proper timerange
      const series = new TimeSeries({
        name: "time",
        columns: ["time"],
        points: [points],
      });

      self.series = series;

      const tr = new TimeRange(1000, 1000000);

      self.initialRange = tr;
      self.brushRange = tr;
    },

    onHotKey() {},
  }));

const style = styler([
  { key: "distance", color: "#e2e2e2" },
  { key: "altitude", color: "#e2e2e2" },
  { key: "cadence", color: "#ff47ff" },
  { key: "power", color: "green", width: 1, opacity: 0.5 },
  { key: "temperature", color: "#cfc793" },
  { key: "speed", color: "steelblue", width: 1, opacity: 0.5 },
]);

// Baselines are the dotted average lines displayed on the chart
// In this case these are separately styled

const baselineStyles = {
  speed: {
    stroke: "steelblue",
    opacity: 0.5,
    width: 0.25,
  },
  power: {
    stroke: "green",
    opacity: 0.5,
    width: 0.25,
  },
};

// d3 formatter to display the speed with one decimal place
const speedFormat = format(".1f");

const TimeSeriesOverview = observer(({ item }) => {
  return (
    <div data-id={item._needsUpdate}>
      <ChartContainer
        timeAxisHeight={0}
        timeRange={item.series.timerange()}
        format="relative"
        /* trackerPosition={this.state.tracker} */
      >
        <ChartRow height="40" debug={false}>
          <Brush
            timeRange={item.brushRange}
            style={{ fill: "#cccccc" }}
            allowSelectionClear
            onTimeRangeChanged={item.updateTR}
          />
          <Charts>
            <AreaChart
              axis="axis1"
              style={{ fill: "#cc0000" }}
              /* columns={{ up: ["altitude"], down: [] }} */
              series={item.series}
            />
          </Charts>
        </ChartRow>
      </ChartContainer>
    </div>
  );
});

const HtxTimeSeriesViewRTS = observer(({ store, item }) => {
  return (
    <ObjectTag item={item}>
      <div
        onWheel={e => {
          e = e || window.event;
          if (e.preventDefault) {
            e.preventDefault();
          }
          e.returnValue = false;
          return false;
        }}
      >
        {Tree.renderChildren(item)}
        <TimeSeriesOverview item={item} />
      </div>
    </ObjectTag>
  );
});

const TimeSeriesModel = types.compose("TimeSeriesModel", TagAttrs, Model);
const HtxTimeSeries = inject("store")(observer(HtxTimeSeriesViewRTS));

Registry.addTag("timeseries", TimeSeriesModel, HtxTimeSeries);

export { TimeSeriesModel, HtxTimeSeries };
