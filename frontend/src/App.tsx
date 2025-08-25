import React from "react";
import CustomModal from "./components/Modal";
import AuthModal from "./components/AuthModal";
import api from "./api";
import {
  AuthMode, Filter, Flash, LoginPayload,
  RegisterPayload, Todo, Tokens
} from "./types";

interface State {
  filter: Filter;
  todoList: Todo[];
  activeItem: Todo;
  modal: boolean;
  authModal: boolean;
  authMode: AuthMode;
  isAuth: boolean;
  flash: Flash | null;
}

export default class App extends React.Component<{}, State> {
  state: State = {
    filter: "all",
    todoList: [],
    activeItem: { title: "", description: "", inprogress: false, completed: false },
    modal: false,
    authModal: false,
    authMode: "login",
    isAuth: !!localStorage.getItem("access"),
    flash: null,
  };

  componentDidMount() {
    if (this.state.isAuth) this.refreshList();
  }

  // ===== UI helper: toast léger =====
  flash = (text: string, type: Flash["type"] = "success") => {
    this.setState({ flash: { text, type } });
    setTimeout(() => this.setState({ flash: null }), 2200);
  };

  // ===== TODOS =====
  refreshList = () =>
    api
      .get<Todo[]>("/api/todos/")
      .then((res) => this.setState({ todoList: res.data }))
      .catch(() => this.flash("Impossible de charger les tâches", "danger"));

  toggle = () => this.setState((p: State) => ({ modal: !p.modal }));

  createItem = () =>
    this.setState({
      activeItem: { title: "", description: "", inprogress: false, completed: false },
      modal: true,
    });

  editItem = (item: Todo) => this.setState({ activeItem: item, modal: true });

  handleSubmit = (item: Todo) => {
    this.toggle();
    const isUpdate = !!item.id;
    const req = isUpdate
      ? api.put<Todo>(`/api/todos/${item.id}/`, item)
      : api.post<Todo>(`/api/todos/`, item);

    req
      .then((res) => {
        const saved = res.data;
        if (isUpdate) {
          this.setState(
            (prev: State) => ({ todoList: prev.todoList.map((t: Todo) => (t.id === saved.id ? saved : t)) }),
            () => this.flash("Tâche mise à jour ✅")
          );
        } else {
          this.setState(
            (prev: State) => ({ todoList: [saved, ...prev.todoList] }),
            () => this.flash("Tâche ajoutée ✅")
          );
        }
      })
      .catch((err: any) => {
        const status = err.response?.status;
        const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        this.flash(`Erreur lors de l’enregistrement (${status}) : ${detail}`, "danger");
        this.refreshList();
      });
  };

  handleDelete = (item: Todo) => {
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
    api
      .delete(`/api/todos/${item.id}/`)
      .then(() =>
        this.setState(
          (prev: State) => ({ todoList: prev.todoList.filter((t: Todo) => t.id !== item.id) }),
          () => this.flash("Tâche supprimée 🗑️")
        )
      )
      .catch(() => this.flash("Suppression impossible", "danger"));
  };

  // ===== AUTH =====
  openLogin = () => this.setState({ authModal: true, authMode: "login" });
  openRegister = () => this.setState({ authModal: true, authMode: "register" });
  closeAuth = () => this.setState({ authModal: false });

  handleLogin = async ({ username, password }: LoginPayload) => {
    try {
      const { data } = await api.post<Tokens>("/api/token/", { username, password });
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      this.setState({ isAuth: true, authModal: false }, () => {
        this.refreshList();
        this.flash("Bienvenue 👋");
      });
    } catch (err: any) {
      this.flash(
        "Login failed: " + (err.response?.data ? JSON.stringify(err.response.data) : err.message),
        "danger"
      );
    }
  };

  handleRegister = async (payload: RegisterPayload) => {
    try {
      const { data } = await api.post<Tokens>("/api/register/", payload);
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      this.setState({ isAuth: true, authModal: false }, () => {
        this.refreshList();
        this.flash("Compte créé 🎉");
      });
    } catch (err: any) {
      this.flash(
        "Register failed: " + (err.response?.data ? JSON.stringify(err.response.data) : err.message),
        "danger"
      );
    }
  };

  logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    this.setState({ isAuth: false, todoList: [] }, () => this.flash("Déconnecté"));
  };

  // ===== RENDER HELPERS =====
  getCounts = () => {
    const { todoList } = this.state;
    return {
      all: todoList.length,
      completed: todoList.filter((t) => t.completed).length,
      inprogress: todoList.filter((t) => t.inprogress && !t.completed).length,
      open: todoList.filter((t) => !t.inprogress && !t.completed).length,
    };
  };

  renderTabList = () => {
    const c = this.getCounts();
    const tabs: Array<[Filter, string, number, string]> = [
      ["all", "All", c.all, "secondary"],
      ["open", "Not started", c.open, "danger"],
      ["inprogress", "In progress", c.inprogress, "warning"],
      ["completed", "Complete", c.completed, "success"],
    ];
    return (
      <div className="nav nav-pills justify-content-center gap-2 mb-3">
        {tabs.map(([val, label, count, color]) => (
          <button
            key={val}
            type="button"
            className={"btn " + (this.state.filter === val ? "btn-" + color : "btn-outline-" + color)}
            onClick={() => this.setState({ filter: val })}
          >
            {label} <span className={`badge text-bg-${color} ms-2`}>{count}</span>
          </button>
        ))}
      </div>
    );
  };

  renderStatusBadge = (item: Todo) => {
    if (item.completed) return <span className="badge text-bg-success">Completed</span>;
    if (item.inprogress) return <span className="badge text-bg-warning">In progress</span>;
    return <span className="badge text-bg-danger">Not started</span>;
  };

  renderItems = () => {
    const { filter, todoList } = this.state;
    let list = todoList.filter((it) => {
      if (filter === "completed") return it.completed;
      if (filter === "inprogress") return it.inprogress && !it.completed;
      if (filter === "open") return !it.inprogress && !it.completed;
      return true;
    });
    if (filter === "all") {
      const pr = (it: Todo) => (it.completed ? 2 : it.inprogress ? 1 : 0);
      list = [...list].sort((a, b) => pr(a) - pr(b));
    }
    if (!list.length)
      return (
        <div className="text-center py-5">
          <div className="display-6 mb-2">Rien à afficher</div>
          <p className="text-muted mb-4">Ajoute une tâche pour commencer.</p>
          <button className="btn btn-primary btn-lg" onClick={this.createItem}>+ Add task</button>
        </div>
      );
    return list.map((item) => (
      <li
        key={item.id}
        className="list-group-item list-group-item-action d-flex justify-content-between align-items-start border-0 rounded-3 shadow-sm mb-2 item-hover"
      >
        <div className="me-3">
          <div className={`fw-semibold ${item.completed ? "completed-todo" : ""}`}>
            {item.title} &nbsp; {this.renderStatusBadge(item)}
          </div>
          {item.description && <small className="text-muted d-block mt-1">{item.description}</small>}
        </div>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" onClick={() => this.editItem(item)}>Edit</button>
          <button className="btn btn-outline-danger" onClick={() => this.handleDelete(item)}>Delete</button>
        </div>
      </li>
    ));
  };

  // ===== RENDER =====
  render() {
    const { isAuth, authModal, authMode, flash } = this.state;

    return (
      <div className="app-bg min-vh-100 d-flex flex-column">
        {/* Toast */}
        {flash && (
          <div className={`toast show toast-top align-items-center text-bg-${flash.type}`} role="alert">
            <div className="d-flex">
              <div className="toast-body">{flash.text}</div>
            </div>
          </div>
        )}

        <header className="site-header">
          <div className="container d-flex align-items-center justify-content-between">
            <div className="brand d-flex align-items-center gap-2">
              <div className="brand-dot"></div>
              <span className="fw-bold">Todo app</span>
            </div>
            {isAuth && (
              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={this.createItem}>+ Nouvelle tâche</button>
                <button className="btn btn-outline-secondary" onClick={this.logout}>Se déconnecter</button>
              </div>
            )}
          </div>
        </header>

        <main className="container flex-grow-1">
          {!isAuth ? (
            <section className="hero d-flex align-items-center justify-content-center">
              <div className="glass-card rounded-5 shadow-xl text-center p-5 p-md-6">
                <h1 className="display-5 fw-bold gradient-text mb-2">Organise tout, sans effort</h1>
                <p className="text-muted mb-4">Crée tes tâches, suis leur progression et reste focus.</p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  <button className="btn btn-gradient btn-lg" onClick={this.openRegister}>Créer un compte</button>
                  <button className="btn btn-ghost btn-lg" onClick={this.openLogin}>Se connecter</button>
                </div>
              </div>
            </section>
          ) : (
            <section className="py-4">
              <div className="card glass-card border-0 rounded-4 p-3 p-md-4 shadow-lg">
                {this.renderTabList()}
                <ul className="list-unstyled mt-2">{this.renderItems()}</ul>
              </div>
            </section>
          )}

          {this.state.modal && (
            <CustomModal
              activeItem={this.state.activeItem}
              toggle={this.toggle}
              onSave={this.handleSubmit}
            />
          )}

          {authModal && (
            <AuthModal
              isOpen={authModal}
              mode={authMode}
              toggle={this.closeAuth}
              switchMode={(m) => this.setState({ authMode: m })}
              onLogin={this.handleLogin}
              onRegister={this.handleRegister}
            />
          )}
        </main>

        <footer className="py-4 text-center text-muted small">
          Fait avec <span className="text-danger">♥</span> — Bootstrap&nbsp;5 & Reactstrap
        </footer>
      </div>
    );
  }
}
