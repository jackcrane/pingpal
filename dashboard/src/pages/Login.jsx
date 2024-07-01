import React, { useState } from "react";
import {
  ActionButton,
  Column,
  Container,
  H1,
  H2,
  P,
  Red,
  Row,
  Spacer,
  TextInput,
  TextLink,
} from "../kit";
import Styled from "styled-components";
import { Header } from "../components/Header";
import screenshot from "../assets/screenshot.png";
import { url } from "../lib/url";

const Screenshot = Styled.img`
  height: 600px;
  object-fit: contain;
  transform: translateX(50%);
  opacity: 0.5;
  filter: sepia(0.5);
  transition: opacity 0.5s, filter 0.5s;
  &:hover {
    opacity: 1;
    filter: none;
  }
`;

const Half = Styled.div`
  width: 50%;
  display: flex;
  overflow-x: hidden;
`;

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    // Basic validation
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);

    const f = await fetch(url("/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const j = await f.json();

    if (f.status === 200) {
      localStorage.setItem("token", j.token);
      window.location.href = "/";
    } else {
      setError(j.error);
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header />
      <Row style={{ height: "80vh" }}>
        <Half>
          <Column style={{ minWidth: 400 }}>
            <H2>Log in</H2>
            <Spacer height="20px" />
            <label>Your email</label>
            <TextInput
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Spacer height="20px" />
            <label>Pick a password</label>
            <TextInput
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Spacer height="20px" />
            {error && <Red>{error}</Red>}
            <ActionButton disabled={loading} onClick={handleLogin}>
              {loading ? "Loading..." : "Login"}
            </ActionButton>
            <Spacer height="20px" />
            <TextLink to="/register">
              Don't have an account? Register here
            </TextLink>
          </Column>
        </Half>
        <Half style={{ justifyContent: "flex-end" }}>
          <Screenshot src={screenshot} alt="screenshot" />
        </Half>
      </Row>
    </Container>
  );
};