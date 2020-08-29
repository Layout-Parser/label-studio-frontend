import React from "react";
import { Button, Tooltip, Slider, Radio, Checkbox } from "antd";
import { observer, inject } from "mobx-react";
import { CheckOutlined, CheckCircleOutlined } from "@ant-design/icons";

import Hint from "../Hint/Hint";
import styles from "./Controls.module.scss";

const TOOLTIP_DELAY = 0.8;

export default inject("store")(
  observer(({ item, store }) => {
    /**
     * Buttons of Controls
     */
    let buttons = {
      skip: "",
      update: "",
      submit: "",
    };

    const { userGenerate, sentUserGenerate } = item;
    const { enableHotkeys, enableTooltips } = store.settings;
    const { interval, filterType, selectedQ } = store.completionStore.selected;
    const { hasMap } = store.completionStore.selected.regionStore;

    /**
     * Task information
     */
    let taskInformation;
    if (store.task) {
      taskInformation = <h4 className={styles.task + " ls-task-info"}>Task ID: {store.task.id}</h4>;
    }

    /**
     * Hotkeys
     */
    if (enableHotkeys && enableTooltips) {
      buttons.submit = <Hint> [ Ctrl+Enter ]</Hint>;
      buttons.skip = <Hint> [ Ctrl+Space ]</Hint>;
      buttons.update = <Hint> [ Alt+Enter] </Hint>;
    }

    let skipButton;
    let updateButton;
    let submitButton;
    let boxFilter;
    let shiftColor;

    /**
     * Check for Predict Menu
     */
    if (!store.completionStore.predictSelect || store.explore) {
      if (store.hasInterface("skip")) {
        skipButton = (
          <Tooltip title="Skip task: [ Ctrl+Space ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button type="ghost" onClick={store.skipTask} className={styles.skip + " ls-skip-btn"}>
              Skip {buttons.skip}
            </Button>
          </Tooltip>
        );
      }

      if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        submitButton = (
          <Tooltip title="Save results: [ Ctrl+Enter ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={store.submitCompletion}
              className={styles.submit + " ls-submit-btn"}
            >
              Submit {buttons.submit}
            </Button>
          </Tooltip>
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        updateButton = (
          <Tooltip title="Update this task: [ Alt+Enter ]" mouseEnterDelay={TOOLTIP_DELAY}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={store.updateCompletion}
              className="ls-update-btn"
            >
              Update {buttons.update}
            </Button>
          </Tooltip>
        );
      }

      function formatter(value) {
        return `${value}%`;
      }

      // Box filtering module ------------------------------------
      if (store.task) {
        let slider = (
          <Slider
            range
            key={item.id}
            step={0.01}
            tipFormatter={formatter}
            defaultValue={interval ? interval : [0, 100]}
            style={{ width: "200px", marginTop: "25px" }}
            onChange={store.updateVisibility}
          />
        );

        let QuartBtns = (
          <div style={{ display: "inline-block" }}>
            <Button
              key={0}
              type={selectedQ[0] === 1 ? "primary" : "default"}
              style={{ borderRadius: 0, height: "25px", lineHeight: "20px", paddingTop: 0 }}
              onClick={() => {
                store.updateQuartile(0);
              }}
            >
              Q1
            </Button>
            <Button
              key={1}
              type={selectedQ[1] === 1 ? "primary" : "default"}
              style={{ borderRadius: 0, height: "25px", lineHeight: "20px", paddingTop: 0 }}
              onClick={() => {
                store.updateQuartile(1);
              }}
            >
              Q2
            </Button>
            <Button
              key={2}
              type={selectedQ[2] === 1 ? "primary" : "default"}
              style={{ borderRadius: 0, height: "25px", lineHeight: "20px", paddingTop: 0 }}
              onClick={() => {
                store.updateQuartile(2);
              }}
            >
              Q3
            </Button>
            <Button
              key={3}
              type={selectedQ[3] === 1 ? "primary" : "default"}
              style={{ borderRadius: 0, height: "25px", lineHeight: "20px", paddingTop: 0 }}
              onClick={() => {
                store.updateQuartile(3);
              }}
            >
              Q4
            </Button>
          </div>
        );

        boxFilter = (
          <div>
            <div style={{ marginBottom: "10px" }}>
              <Radio.Group defaultValue={filterType} buttonStyle="solid">
                <Radio.Button
                  value="Quantile"
                  onChange={store.updateFilterOpt}
                  style={{ height: "25px", lineHeight: "20px" }}
                >
                  Quartile
                </Radio.Button>
                <Radio.Button
                  value="Score"
                  onChange={store.updateFilterOpt}
                  style={{ height: "25px", lineHeight: "20px" }}
                >
                  Score
                </Radio.Button>
                <Radio.Button
                  value="Class"
                  onChange={store.updateFilterOpt}
                  style={{ height: "25px", lineHeight: "20px" }}
                >
                  Class
                </Radio.Button>
              </Radio.Group>
            </div>
            <div>{filterType === "Quantile" ? QuartBtns : filterType === "Score" ? slider : null}</div>
          </div>
        );

        shiftColor = (
          <Checkbox onChange={store.shiftBoxesColor} checked={hasMap}>
            Shift Color of Detected Objects
          </Checkbox>
        );
      }
      // Box filtering module ------------------------------------
    }

    let content = (
      <div className={styles.block}>
        <div className={styles.wrapper}>
          <div className={styles.container}>
            {skipButton}
            {updateButton}
            {submitButton}
          </div>
          {boxFilter}
          {shiftColor}
          {taskInformation}
        </div>
      </div>
    );

    return (item.type === "completion" || store.explore) && content;
  }),
);
