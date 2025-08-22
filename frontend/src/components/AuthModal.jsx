import React, { Component } from "react";
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

export default class AuthModal extends Component {
  state = { username: "", password: "", firstName: "", lastName: "", email: "" };

  handleChange = (e) => this.setState({ [e.target.name]: e.target.value });

  onSubmit = (e) => {
    e.preventDefault();
    const { mode, onLogin, onRegister } = this.props;
    const { username, password, firstName, lastName, email } = this.state;
    if (mode === "login") return onLogin({ username, password });
    onRegister({ username, password, first_name: firstName, last_name: lastName, email });
  };

  render() {
    const { isOpen, toggle, mode, switchMode } = this.props;
    const { username, password, firstName, lastName, email } = this.state;

    return (
      <RSModal isOpen={isOpen} toggle={toggle} centered contentClassName="modal-glass rounded-4 modal-anim">
        <ModalHeader toggle={toggle} className="border-0">
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </ModalHeader>

        <ModalBody>
          <Form onSubmit={this.onSubmit} className="row g-3">
            {mode === "register" && (
              <>
                <FormGroup className="col-12">
                  <Label>First name</Label>
                  <Input name="firstName" value={firstName} onChange={this.handleChange} placeholder="John" />
                </FormGroup>
                <FormGroup className="col-12">
                  <Label>Last name</Label>
                  <Input name="lastName" value={lastName} onChange={this.handleChange} placeholder="Doe" />
                </FormGroup>
                <FormGroup className="col-12">
                  <Label>Email address</Label>
                  <Input type="email" name="email" value={email} onChange={this.handleChange} placeholder="john@doe.com" />
                </FormGroup>
              </>
            )}

            <FormGroup className="col-12">
              <Label>Username</Label>
              <Input name="username" value={username} onChange={this.handleChange} placeholder="johndoe" />
            </FormGroup>

            <FormGroup className="col-12">
              <Label>Password</Label>
              <Input type="password" name="password" value={password} onChange={this.handleChange} placeholder="••••••••" />
            </FormGroup>

            <div className="col-12 d-flex justify-content-end gap-2">
              <Button type="button" color="secondary" outline onClick={toggle}>Annuler</Button>
              <Button type="submit" className="btn-gradient">{mode === "login" ? "Login" : "Créer le compte"}</Button>
            </div>
          </Form>
        </ModalBody>

        <ModalFooter className="border-0 pt-0">
          {mode === "login" ? (
            <small className="text-muted">
              Pas de compte ?{" "}
              <button type="button" className="btn btn-link p-0" onClick={() => switchMode("register")}>
                Créer un compte
              </button>
            </small>
          ) : (
            <small className="text-muted">
              Déjà inscrit ?{" "}
              <button type="button" className="btn btn-link p-0" onClick={() => switchMode("login")}>
                Se connecter
              </button>
            </small>
          )}
        </ModalFooter>
      </RSModal>
    );
  }
}
