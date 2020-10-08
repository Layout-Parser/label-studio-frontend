import React, { Component } from "react";
import { Card, Input, Tag } from "antd";
import { observer } from "mobx-react";

import styles from "../Completions/Completions.module.scss";
import { EditOutlined, CheckCircleOutlined } from "@ant-design/icons";

class Comments extends Component {
  constructor(props) {
    super(props);
    this.state = {
      access: "read",
      comment: this.props.store.completionStore.selected.comment,
    };
  }

  editComment = () => {
    this.setState({ access: "write" });
  };

  updateComment = () => {
    this.props.store.updateComment(this.state.comment);
    this.setState({ access: "read" });
  };

  onChangeComment = ({ target: { value } }) => {
    this.setState({ comment: value });
  };

  test = () => {
    console.log("aha");
  };

  parse = comment => {
    let { regions } = this.props.store.completionStore.selected.regionStore;
    let ids = regions.map(region => region.id);
    let colors = regions.map(region => region.fillColor);
    let res = [];
    let tokens = comment.split(" ");
    tokens.forEach(token => {
      if (token[0] !== "@") {
        res.push(token + " ");
      } else if (!ids.includes(token.substring(1))) {
        res.push(token + " ");
      } else {
        res.push(
          <Tag
            onClick={e => {
              const idx = regions.findIndex(r => r.selected);
              if (idx !== -1 && regions.length >= 2) regions[idx].unselectRegion();
              const region = regions.filter(region => region.id === token.substring(1))[0];
              region.selectRegion();
            }}
            color={colors[ids.indexOf(token.substring(1))]}
          >
            {token}
          </Tag>,
        );
      }
    });
    return res;
  };

  render() {
    const { store } = this.props;
    const { comment } = store.completionStore.selected;
    const { TextArea } = Input;

    let title = (
      <div className={styles.title + " " + styles.titlespace}>
        <h3>Comments</h3>
      </div>
    );

    let commentAction =
      this.state.access === "read" ? (
        <EditOutlined onClick={this.editComment} key="edit" />
      ) : (
        <CheckCircleOutlined onClick={this.updateComment} key="done" />
      );

    let readOnlyComment = (
      <div style={{ padding: "5px 12px", minHeight: 50, maxHeight: 200 }}>
        <span style={{ overflow: "auto", display: "block", maxHeight: 190 }}>{this.parse(comment)}</span>
      </div>
    );

    return (
      <Card title={title} size="small" bodyStyle={{ padding: 0 }} actions={[commentAction]}>
        {this.state.access === "read" ? (
          readOnlyComment
        ) : (
          <TextArea rows={4} defaultValue={comment} style={{ maxHeight: 200 }} onChange={this.onChangeComment} />
        )}
      </Card>
    );
  }
}

export default observer(Comments);
