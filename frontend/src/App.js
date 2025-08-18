import React, { Component } from "react";
import CustomModal from "./components/Modal";
import api from "./api";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewCompleted: false,
      todoList: [],
      modal: false,
      activeItem: {
        title: "",
        description: "",
        completed: false,
      },
      // 🔑 auth UI
      username: "",
      password: "",
      isAuth: !!localStorage.getItem("access"),
    };
  }

  async componentDidMount() {
    if (this.state.isAuth) {
      this.refreshList();
    }
  }

  refreshList = () => {
    return api
      .get("/api/todos/")
      .then((res) => this.setState({ todoList: res.data }))
      .catch((err) => console.error(err));
  };

  toggle = () => {
    this.setState((prev) => ({ modal: !prev.modal }));
  };

  handleSubmit = (item) => {
    this.toggle();

    const req = item.id
      ? api.put(`/api/todos/${item.id}/`, item)
      : api.post("/api/todos/", item);

    req.then(this.refreshList).catch((err) => console.error(err));
  };

  handleDelete = (item) => {
    api
      .delete(`/api/todos/${item.id}/`)
      .then(this.refreshList)
      .catch((err) => console.error(err));
  };

  createItem = () => {
    const item = { title: "", description: "", completed: false };
    this.setState({ activeItem: item, modal: true });
  };

  editItem = (item) => {
    this.setState({ activeItem: item, modal: true });
  };

  displayCompleted = (status) => {
    this.setState({ viewCompleted: status });
  };

  // 🔐 Auth handlers
  login = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;
    try {
      const { data } = await api.post("/api/token/", { username, password });
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      this.setState({ isAuth: true }, this.refreshList);
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    this.setState({ isAuth: false, todoList: [] });
  };

  renderTabList = () => {
    return (
      <div className="nav nav-tabs">
        <span
          onClick={() => this.displayCompleted(true)}
          className={this.state.viewCompleted ? "nav-link active" : "nav-link"}
        >
          Complete
        </span>
        <span
          onClick={() => this.displayCompleted(false)}
          className={this.state.viewCompleted ? "nav-link" : "nav-link active"}
        >
          Incomplete
        </span>
      </div>
    );
  };

  renderItems = () => {
    const { viewCompleted, todoList } = this.state;
    const newItems = todoList.filter((item) => item.completed === viewCompleted);

    return newItems.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${
            viewCompleted ? "completed-todo" : ""
          }`}
          title={item.description}
        >
          {item.title}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editItem(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  render() {
    const { isAuth, username, password } = this.state;

    return (
      <main className="container">
        <h1 className="text-white text-uppercase text-center my-4">Todo app</h1>

        {/* 🔐 Zone Auth */}
        {!isAuth ? (
          <form onSubmit={this.login} className="mb-4 d-flex gap-2">
            <input
              className="form-control"
              placeholder="Username"
              value={username}
              onChange={(e) => this.setState({ username: e.target.value })}
            />
            <input
              className="form-control"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => this.setState({ password: e.target.value })}
            />
            <button className="btn btn-success" type="submit">
              Login
            </button>
          </form>
        ) : (
          <div className="mb-4 d-flex gap-2">
            <button className="btn btn-primary" onClick={this.createItem}>
              Add task
            </button>
            <button className="btn btn-outline-secondary" onClick={this.logout}>
              Logout
            </button>
          </div>
        )}

        {/* 📋 Liste */}
        <div className="row">
          <div className="col-md-6 col-sm-10 mx-auto p-0">
            <div className="card p-3">
              {this.renderTabList()}
              <ul className="list-group list-group-flush border-top-0">
                {this.renderItems()}
              </ul>
            </div>
          </div>
        </div>

        {/* 🪟 Modal */}
        {this.state.modal ? (
          <CustomModal
            activeItem={this.state.activeItem}
            toggle={this.toggle}
            onSave={this.handleSubmit}
          />
        ) : null}
      </main>
    );
  }
}

export default App;
