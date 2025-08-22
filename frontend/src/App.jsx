// src/App.jsx
import React, { Component } from "react";
import CustomModal from "./components/Modal";     // ← ton modal de tâches existant
import AuthModal from "./components/AuthModal";   // ← le modal Login/Register
import api from "./api";                          // ← axios préconfiguré (baseURL + Authorization)

class App extends Component {
  /* ----------------------- ÉTAT GLOBAL ----------------------- */
  // On utilise la syntaxe "class fields" pour éviter le bind(this)
  state = {
    // Filtre d’affichage (onglets)
    filter: "all", // all | open | inprogress | completed

    // Données
    todoList: [],
    activeItem: { title: "", description: "", inprogress: false, completed: false },

    // Modals
    modal: false,        // modal tâches
    authModal: false,    // modal auth
    authMode: "login",   // "login" | "register"

    // Authentification
    isAuth: !!localStorage.getItem("access"),

    // Toast/flash (messages de confirmation)
    // format: { text: "Message…", type: "success" | "danger" | "info" | "warning" }
    flash: null,
  };

  /* ------------------- LIFECYCLE / INIT DATA ------------------- */
  componentDidMount() {
    // Si déjà connecté (token en localStorage), on récupère la liste
    if (this.state.isAuth) this.refreshList();
  }

  /* ----------------------- HELPERS UI ----------------------- */
  // Affiche un toast pendant ~2.2s
  flash = (text, type = "success") => {
    this.setState({ flash: { text, type } });
    setTimeout(() => this.setState({ flash: null }), 2200);
  };

  /* ----------------------- API TODOS ----------------------- */
  // Récupère la liste des tâches de l'utilisateur
  refreshList = () => {
    return api
      .get("/api/todos/")
      .then((res) => this.setState({ todoList: res.data }))
      .catch((err) => {
        console.error(err);
        this.flash("Impossible de charger les tâches", "danger");
      });
  };

  // Ouvre/ferme le modal de tâches
  toggle = () => this.setState((prev) => ({ modal: !prev.modal }));

  // Préparer la création d'une tâche
  createItem = () =>
    this.setState({
      activeItem: { title: "", description: "", inprogress: false, completed: false },
      modal: true,
    });

  // Préparer l'édition d'une tâche
  editItem = (item) => this.setState({ activeItem: item, modal: true });

  // Créer/Mettre à jour une tâche (optimiste + toast)
  handleSubmit = (item) => {
    this.toggle(); // ferme le modal
    const isUpdate = !!item.id;

    const req = isUpdate
      ? api.put(`/api/todos/${item.id}/`, item)
      : api.post(`/api/todos/`, item);

    req
      .then((res) => {
        const saved = res.data;
        if (isUpdate) {
          // Remplace la tâche dans la liste
          this.setState(
            (prev) => ({
              todoList: prev.todoList.map((t) => (t.id === saved.id ? saved : t)),
            }),
            () => this.flash("Tâche mise à jour ✅")
          );
        } else {
          // Insère la nouvelle tâche en tête
          this.setState(
            (prev) => ({ todoList: [saved, ...prev.todoList] }),
            () => this.flash("Tâche ajoutée ✅")
          );
        }
      })
      .catch((err) => {
        console.error(err);
        this.flash("Erreur lors de l’enregistrement", "danger");
        // En secours, on recharge pleinement depuis l’API
        this.refreshList();
      });
  };

  // Supprimer une tâche (avec confirmation + toast)
  handleDelete = (item) => {
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return;

    api
      .delete(`/api/todos/${item.id}/`)
      .then(() =>
        this.setState(
          (prev) => ({ todoList: prev.todoList.filter((t) => t.id !== item.id) }),
          () => this.flash("Tâche supprimée 🗑️")
        )
      )
      .catch((err) => {
        console.error(err);
        this.flash("Suppression impossible", "danger");
      });
  };

  /* ------------------------- AUTH ------------------------- */
  openLogin = () => this.setState({ authModal: true, authMode: "login" });
  openRegister = () => this.setState({ authModal: true, authMode: "register" });
  closeAuth = () => this.setState({ authModal: false });

  // Connexion
  handleLogin = async ({ username, password }) => {
    try {
      const { data } = await api.post("/api/token/", { username, password });
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      this.setState({ isAuth: true, authModal: false }, () => {
        this.refreshList();
        this.flash("Bienvenue 👋");
      });
    } catch (err) {
      console.error(err);
      this.flash(
        "Login failed: " + (err.response?.data ? JSON.stringify(err.response.data) : err.message),
        "danger"
      );
    }
  };

  // Inscription
  handleRegister = async ({ username, password, first_name, last_name, email }) => {
    try {
      const { data } = await api.post("/api/register/", {
        username,
        password,
        first_name,
        last_name,
        email,
      });
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      this.setState({ isAuth: true, authModal: false }, () => {
        this.refreshList();
        this.flash("Compte créé 🎉");
      });
    } catch (err) {
      console.error(err);
      this.flash(
        "Register failed: " + (err.response?.data ? JSON.stringify(err.response.data) : err.message),
        "danger"
      );
    }
  };

  // Déconnexion
  logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    this.setState({ isAuth: false, todoList: [] }, () => this.flash("Déconnecté"));
  };

  /* -------------------- RENDU LISTE + TABS -------------------- */
  // Compteurs pour badges des onglets
  getCounts = () => {
    const { todoList } = this.state;
    return {
      all: todoList.length,
      completed: todoList.filter((t) => t.completed).length,
      inprogress: todoList.filter((t) => t.inprogress && !t.completed).length,
      open: todoList.filter((t) => !t.inprogress && !t.completed).length,
    };
  };

  // Barre d’onglets filtrants
  renderTabList = () => {
    const c = this.getCounts();
    const tabs = [
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

  // Badge d’état par tâche
  renderStatusBadge = (item) => {
    if (item.completed) return <span className="badge text-bg-success">Completed</span>;
    if (item.inprogress) return <span className="badge text-bg-warning">In progress</span>;
    return <span className="badge text-bg-danger">Not started</span>;
  };

  // Liste des tâches filtrées + vide élégant
  renderItems = () => {
    const { filter, todoList } = this.state;

    let list = todoList.filter((it) => {
      if (filter === "completed") return it.completed;
      if (filter === "inprogress") return it.inprogress && !it.completed;
      if (filter === "open") return !it.inprogress && !it.completed;
      return true;
    });

    // En "all", on trie pour voir d’abord Not started, puis In progress, puis Completed
    if (filter === "all") {
      const pr = (it) => (it.completed ? 2 : it.inprogress ? 1 : 0);
      list = [...list].sort((a, b) => pr(a) - pr(b));
    }

    if (!list.length) {
      return (
        <div className="text-center py-5">
          <div className="display-6 mb-2">Rien à afficher</div>
          <p className="text-muted mb-4">Ajoute une tâche pour commencer.</p>
          <button className="btn btn-primary btn-lg" onClick={this.createItem}>
            + Add task
          </button>
        </div>
      );
    }

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
          <button className="btn btn-outline-secondary" onClick={() => this.editItem(item)}>
            Edit
          </button>
          <button className="btn btn-outline-danger" onClick={() => this.handleDelete(item)}>
            Delete
          </button>
        </div>
      </li>
    ));
  };

  /* -------------------------- RENDER -------------------------- */
  render() {
    const { isAuth, authModal, authMode, flash } = this.state;

    return (
      <div className="app-bg min-vh-100 d-flex flex-column">
        {/* Header compact avec actions à droite si connecté */}
        <header className="site-header">
          <div className="container d-flex align-items-center justify-content-between">
            <div className="brand d-flex align-items-center gap-2">
              <div className="brand-dot"></div>
              <span className="fw-bold">Todo app</span>
            </div>
            {isAuth && (
              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={this.createItem}>
                  + Nouvelle tâche
                </button>
                <button className="btn btn-outline-secondary" onClick={this.logout}>
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Corps */}
        <main className="container flex-grow-1">
          {!isAuth ? (
            // Accueil "Hero" (pas connecté)
            <section className="hero d-flex align-items-center justify-content-center">
              <div className="glass-card rounded-5 shadow-xl text-center p-5 p-md-6">
                <h1 className="display-5 fw-bold gradient-text mb-2">Organise tout, sans effort</h1>
                <p className="text-muted mb-4">Crée tes tâches, suis leur progression et reste focus.</p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  <button className="btn btn-gradient btn-lg" onClick={this.openRegister}>
                    Créer un compte
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={this.openLogin}>
                    Se connecter
                  </button>
                </div>
              </div>
            </section>
          ) : (
            // Vue "Mes tâches" (connecté)
            <section className="py-4">
              <div className="card glass-card border-0 rounded-4 p-3 p-md-4 shadow-lg">
                {this.renderTabList()}
                <ul className="list-unstyled mt-2">{this.renderItems()}</ul>
              </div>
            </section>
          )}

        {/* Modal TÂCHES */}
        {this.state.modal && (
          <CustomModal
            activeItem={this.state.activeItem}
            toggle={this.toggle}
            onSave={this.handleSubmit}
            todoList={this.state.todoList}
          />
        )}

        {/* Modal AUTH (login / register) */}
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

        {/* Toast/Flash */}
        {flash && (
          <div className={`alert alert-${flash.type} alert-toast shadow`}>
            {flash.text}
          </div>
        )}
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-muted small">
          Fait avec <span className="text-danger">♥</span> — Bootstrap&nbsp;5 & Reactstrap
        </footer>
      </div>
    );
  }
}

export default App;
