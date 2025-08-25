import React from "react";
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
import { Todo } from "../types";

interface Props {
  activeItem: Todo;
  toggle: () => void;
  onSave: (item: Todo) => void;
}

interface State {
  activeItem: Todo;
}

export default class CustomModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { activeItem: props.activeItem };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.activeItem !== this.props.activeItem) {
      this.setState({ activeItem: this.props.activeItem });
    }
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    let next: Todo = { ...this.state.activeItem, [name]: type === "checkbox" ? checked : value } as Todo;

    // Exclusivité inprogress / completed
    if (name === "inprogress" && checked) next.completed = false;
    if (name === "completed" && checked) next.inprogress = false;

    this.setState({ activeItem: next });
  };

  render() {
    const { toggle, onSave } = this.props;
    const it = this.state.activeItem;

    return (
      <RSModal isOpen={true} toggle={toggle} className="modal-anim modal-glass">
        <ModalHeader toggle={toggle}>Todo Item</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="todo-title">Title</Label>
              <Input
                id="todo-title"
                name="title"
                value={it.title}
                onChange={this.handleChange}
                placeholder="Enter Todo Title"
              />
            </FormGroup>
            <FormGroup>
              <Label for="todo-description">Description</Label>
              <Input
                id="todo-description"
                name="description"
                value={it.description}
                onChange={this.handleChange}
                placeholder="Enter Todo Description"
              />
            </FormGroup>
            <FormGroup check className="mb-2">
              <Label check>
                <Input
                  type="checkbox"
                  name="inprogress"
                  checked={!!it.inprogress && !it.completed}
                  onChange={this.handleChange}
                />{" "}
                In progress
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  name="completed"
                  checked={!!it.completed}
                  onChange={this.handleChange}
                />{" "}
                Completed
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>Cancel</Button>
          <Button color="success" onClick={() => onSave(this.state.activeItem)}>Save</Button>
        </ModalFooter>
      </RSModal>
    );
  }
}
