import React from "react";
import {
  Modal as RSModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import { AuthMode, LoginPayload, RegisterPayload } from "../types";

interface Props {
  isOpen: boolean;
  mode: AuthMode;
  toggle: () => void;
  switchMode: (m: AuthMode) => void;
  onLogin: (p: LoginPayload) => Promise<void> | void;
  onRegister: (p: RegisterPayload) => Promise<void> | void;
}

interface State {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default class AuthModal extends React.Component<Props, State> {
  state: State = {
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
  };

  reset = () =>
    this.setState({ username: "", password: "", first_name: "", last_name: "", email: "" });

  submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, onLogin, onRegister, toggle } = this.props;
    const { username, password, first_name, last_name, email } = this.state;

    if (mode === "login") {
      await onLogin({ username, password });
    } else {
      await onRegister({ username, password, first_name, last_name, email });
    }
    this.reset();
    toggle();
  };

  render() {
    const { isOpen, toggle, mode, switchMode } = this.props;
    const { username, password, first_name, last_name, email } = this.state;

    return (
      <RSModal isOpen={isOpen} toggle={toggle} className="modal-anim modal-glass">
        <ModalHeader toggle={toggle}>
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </ModalHeader>
        <Form onSubmit={this.submit}>
          <ModalBody>
            {mode === "register" && (
              <>
                <FormGroup>
                  <Label>First name</Label>
                  <Input value={first_name} onChange={(e) => this.setState({ first_name: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Last name</Label>
                  <Input value={last_name} onChange={(e) => this.setState({ last_name: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => this.setState({ email: e.target.value })} />
                </FormGroup>
              </>
            )}

            <FormGroup>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => this.setState({ username: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => this.setState({ password: e.target.value })} />
            </FormGroup>
          </ModalBody>
          <ModalFooter className="d-flex justify-content-between">
            <Button color="link" type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Créer un compte" : "Déjà inscrit ? Se connecter"}
            </Button>
            <div>
              <Button color="secondary" type="button" onClick={toggle}>Annuler</Button>
              <Button color="primary" type="submit" className="ms-2">
                {mode === "login" ? "Se connecter" : "Créer"}
              </Button>
            </div>
          </ModalFooter>
        </Form>
      </RSModal>
    );
  }
}
