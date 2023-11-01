"use client";
import React, { useEffect, useState } from "react";
import styles from "@/styles/game.module.scss";
import Select from "react-select";
import { langOptions, selectStyles } from "./constants";
import CodeMirror from "@uiw/react-codemirror";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { githubDark } from "@uiw/codemirror-theme-github";
import { toast } from "sonner";
import * as Diff from "diff";

// get this value from server.
const QstnNum = 1;

const player2 = ({ params }) => {
  const roomID = params.id;

  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runcodeLoading, setRuncodeLoading] = useState(false);
  const [lang, setLang] = useState("javascript");
  const [code, setCode] = useState();
  const [question, setQuestion] = useState();
  const [isTurn, setIsTurn] = useState(false);

  const [testpassed, setTestpassed] = useState(false);
  const [errorString, setErrorString] = useState("");
  const [diff, setDiff] = useState({});

  const fetchTurn = async () => {
    const res = await fetch("/api/turn", {
      cache: "no-store",
      method: "POST",
      body: JSON.stringify({
        roomID,
      }),
    });
    if (res.status === 200) {
      const { turn } = await res.json();
      if (turn == 2) setIsTurn(true);
      else setIsTurn(false);
    } else {
      toast.error("Room not found");
    }
  };

  const fetchQuestion = async () => {
    const res = await fetch("/api/question", {
      cache: "no-store",
      method: "POST",
      body: JSON.stringify({
        roomID,
      }),
    });
    if (res.status === 200) {
      const { question } = await res.json();
      setQuestion(question);
      setCode(question?.template[lang]);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    console.log("submit");
  };

  const handleTest = async () => {
    setRuncodeLoading(true);
    setDiff("");

    const functionName = question?.check_fn;
    let testcaseAddedFns = [];

    if (lang === "java") {
      testcaseAddedFns = question?.test_cases.map(
        (item) => `System.out.println(${functionName}(${item.input}));`
      );
    } else if (lang === "javascript") {
      testcaseAddedFns = question?.test_cases.map(
        (item) => `console.log(${functionName}(${item.input}));`
      );
      testcaseAddedFns = testcaseAddedFns.join('console.log("^v^");');
    } else {
      testcaseAddedFns = question?.test_cases.map((item) => `${functionName}(${item.input})`);
    }

    let reqPayload;

    if (lang === "c") {
      reqPayload = `${code}\n\nint main() {\n${testcaseAddedFns.join(";\n")};\n return 0;\n}`;
    } else if (lang === "java") {
      reqPayload = `${code
        .trim()
        .substring(
          0,
          code.length - 1
        )}\n\npublic static void main(String[] args) {\n${testcaseAddedFns.join(
        '\nSystem.out.println("^v^");\n'
      )}\n    }\n}`;
    } else {
      reqPayload = `${code}\n${testcaseAddedFns}`;
    }
    try {
      const res = await fetch("/api/verify", {
        cache: "no-store",
        method: "POST",
        body: JSON.stringify({
          roomID,
          code: reqPayload,
          lang,
        }),
      });
      if (res.status === 202) {
        setTestpassed(true);
        toast.success("All test cases have been passed. Hit submit to continue.");
      }
      if (res.status === 400) {
        toast.error("Error in your code!");
      }
      if (res.status === 401) {
        const result = await res.json();
        toast.error(result.message);
      }
      if (res.status === 206) {
        const data = await res.json();
        console.log(question?.test_cases[0].output);
        console.log(data.stdOutput[0]);
        
        console.log(Diff(data.stdOutput[0], question?.test_cases[0].output));
        // setDiff(Diff(data.stdOutput[0], test_case.output));
        toast.error("You haven't passed all the test cases🛸");
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setRuncodeLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    // @source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_device_detection
    let hasTouchScreen = false;
    if ("maxTouchPoints" in navigator) {
      hasTouchScreen = navigator.maxTouchPoints > 0;
    } else if ("msMaxTouchPoints" in navigator) {
      hasTouchScreen = navigator.msMaxTouchPoints > 0;
    } else {
      const mQ = matchMedia?.("(pointer:coarse)");
      if (mQ?.media === "(pointer:coarse)") {
        hasTouchScreen = !!mQ.matches;
      } else if ("orientation" in window) {
        hasTouchScreen = true; // deprecated, but good fallback
      } else {
        // Only as a last resort, fall back to user agent sniffing
        const UA = navigator.userAgent;
        hasTouchScreen =
          /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
          /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
      }
    }
    setIsMobile(hasTouchScreen);
    fetchTurn();
    fetchQuestion();
  }, []);

  useEffect(() => {
    if (question) setCode(question?.template[lang]);
  }, [lang]);

  if (loading) {
    return <div className={styles.main}>Loading...</div>;
  }

  if (isMobile) {
    return (
      <div className={styles.main}>
        <div className={styles.head}>
          <div className={styles.title}>EMBRACE THE UNKNOWN</div>
          Room ID: <span>{roomID}</span>
          <br />
          <div className={styles.notmobile}>⚠️ Player 2 must be using a desktop.</div>
        </div>
      </div>
    );
  }
  if (!isTurn) {
    return (
      <div className={styles.main}>
        <div className={styles.head}>
          <div className={styles.title}>EMBRACE THE UNKNOWN</div>
          Room ID: <span>{roomID}</span>
          <br />
        </div>
        <div className={styles.question}>Waiting for player 2 to complete</div>
      </div>
    );
  }
  return (
    <main className={styles.main}>
      <h2 className={styles.title}>Your Coding Challenge</h2>
      <ol className={styles.instructions}>
        <li>
          Player shouldn't rename the function name which is present in the template. If they do,
          the compiler will throw an error and the hidden test case will fail.
        </li>
      </ol>
      <p style={{ margin: "1rem 0", fontWeight: "600" }}>
        <span>Qn: </span>
        {question?.question}
      </p>
      <CodeMirror
        value={code}
        theme={githubDark}
        minHeight="300px"
        maxHeight="400px"
        extensions={[loadLanguage(lang)]}
        placeholder={`Enter your ${lang} code`}
        onChange={(value) => setCode(value)}
      />
      <div className={styles.footer}>
        <Select
          classNamePrefix="select"
          defaultValue={langOptions[0]}
          isSearchable={true}
          onChange={(selectLang) => setLang(selectLang.value)}
          name="lang"
          options={langOptions}
          components={{
            IndicatorSeparator: () => null,
          }}
          styles={selectStyles}
        />
        <div className={styles.test_block}>
          <button className={styles.btn} onClick={() => handleTest()}>
            {runcodeLoading ? "Loading.." : "Run code"}
          </button>
          {testpassed && (
            <button className={styles.btn} onClick={() => handleSubmit()}>
              Submit
            </button>
          )}
        </div>
      </div>
      {!testpassed && <h4 className={styles.hidden_cases}>Other test cases are hidden 🤫.</h4>}
    </main>
  );
};

export default player2;
