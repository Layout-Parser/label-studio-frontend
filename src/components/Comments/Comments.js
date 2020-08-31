import React, { Component } from "react";
import { Card, Input } from "antd";
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
        <span style={{ overflow: "auto", display: "block", maxHeight: 190 }}>{comment}</span>
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
