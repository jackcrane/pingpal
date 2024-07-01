// export const url = (path) => `${path}`;
export const url = (path) => `http://localhost:2000${path}`;

export const AuthFetch = async (path, options) => {
  const token = localStorage.getItem("token");
  const f = await fetch(u(path), {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (f.status === 401) {
    localStorage.removeItem("token");
    // window.location.reload();
    console.log("Unauthorized");
    document.location.href = "/login";
  }
  return f;
};
