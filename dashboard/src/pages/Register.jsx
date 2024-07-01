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

const InputContainer = Styled(Column)`
  width: 100%;
  max-width: 500px;
`;

export const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);

    const f = await fetch(url("/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
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
          <InputContainer>
            <H2>Welcome to PingPal</H2>
            <Spacer height="20px" />
            <label>Your name</label>
            <TextInput
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
            <Spacer height="10px" />
            <ActionButton disabled={loading} onClick={handleRegister}>
              {loading ? "Loading..." : "Register"}
            </ActionButton>
            <Spacer height="20px" />
            <TextLink to="/login">Already have an account? Login here</TextLink>
            <TextLink to="/legal/terms-and-conditions">
              Terms and conditions
            </TextLink>
            <TextLink to="/legal/privacy-policy">Privacy policy</TextLink>
          </InputContainer>
        </Half>
        <Half style={{ justifyContent: "flex-end" }}>
          <Screenshot src={screenshot} alt="screenshot" />
        </Half>
      </Row>
    </Container>
  );
};
