import React, { Component } from "react";
import {
  Button,
  Modal as RSModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label,
} from "reactstrap";

export default class CustomModal extends Component {
  constructor(props) {
    super(props);
    this.state = { activeItem: this.props.activeItem };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.activeItem !== this.props.activeItem) {
      this.setState({ activeItem: this.props.activeItem });
    }
  }

  handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const v = type === "checkbox" ? checked : value;
    const activeItem = { ...this.state.activeItem, [name]: v };

    // exclusivité inprogress/completed
    if (name === "inprogress" && v) activeItem.completed = false;
    if (name === "completed" && v) activeItem.inprogress = false;

    this.setState({ activeItem });
  };

  render() {
    const { toggle, onSave, todoList } = this.props;

    return (
      <RSModal
        isOpen
        toggle={toggle}
        centered
        size="lg"
        contentClassName="modal-glass rounded-4 border-0 modal-anim"
      >
        <ModalHeader toggle={toggle} className="border-0 pb-0">
          <div className="w-100">
            <h5 className="m-0 gradient-text">Add / Edit Task</h5>
            <small className="text-muted">Provide details below</small>
          </div>
        </ModalHeader>

        <ModalBody className="pt-3">
          <Form className="row g-3">
            <FormGroup className="col-12">
              <Label htmlFor="todo-title" className="fw-semibold">Title</Label>
              <Input
                id="todo-title"
                name="title"
                className="form-control form-control-lg"
                placeholder="Enter todo title"
                value={this.state.activeItem.title}
                onChange={this.handleChange}
              />
            </FormGroup>

            <FormGroup className="col-12">
              <Label htmlFor="todo-description" className="fw-semibold">Description</Label>
              <Input
                id="todo-description"
                name="description"
                type="textarea"
                rows="3"
                className="form-control"
                placeholder="Enter todo description"
                value={this.state.activeItem.description}
                onChange={this.handleChange}
              />
            </FormGroup>

            <div className="col-12 d-flex gap-4 mt-2">
              <div className="form-check form-switch">
                <Input
                  id="inprogressSwitch"
                  type="checkbox"
                  name="inprogress"
                  className="form-check-input"
                  checked={!!this.state.activeItem.inprogress}
                  onChange={this.handleChange}
                  disabled={!!this.state.activeItem.completed}
                />
                <Label className="form-check-label ms-2" htmlFor="inprogressSwitch">
                  In progress
                </Label>
              </div>

              <div className="form-check form-switch">
                <Input
                  id="completedSwitch"
                  type="checkbox"
                  name="completed"
                  className="form-check-input"
                  checked={!!this.state.activeItem.completed}
                  onChange={this.handleChange}
                  disabled={!!this.state.activeItem.inprogress}
                />
                <Label className="form-check-label ms-2" htmlFor="completedSwitch">
                  Completed
                </Label>
              </div>
            </div>

            {/* (Optionnel) Liste de toutes les tâches */}
            {Array.isArray(todoList) && todoList.length > 0 && (
              <div className="col-12 mt-2">
                <Label className="fw-semibold">All tasks</Label>
                <div className="list-group small">
                  {todoList.map((t) => (
                    <div
                      key={t.id}
                      className="list-group-item list-group-item-action rounded-3 mb-2 border-0 shadow-sm"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form>
        </ModalBody>

        <ModalFooter className="border-0 pt-0">
          <Button color="secondary" outline onClick={toggle}>
            Cancel
          </Button>
          <Button className="btn-gradient" onClick={() => onSave(this.state.activeItem)}>
            Save task
          </Button>
        </ModalFooter>
      </RSModal>
    );
  }
}
