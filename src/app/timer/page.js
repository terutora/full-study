// src/app/timer/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { timerService, testSupabaseConnection } from "@/lib/supabase";

export default function Timer() {
  // ポモドーロタイマーの状態
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25分（秒単位）
  const [shortBreakTime, setShortBreakTime] = useState(5 * 60); // 5分
  const [longBreakTime, setLongBreakTime] = useState(15 * 60); // 15分
  const [currentMode, setCurrentMode] = useState("pomodoro"); // 'pomodoro', 'shortBreak', 'longBreak'
  const [timeLeft, setTimeLeft] = useState(pomodoroTime);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [pomodoroGoal, setPomodoroGoal] = useState(4);

  // 学習時間の状態
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState(0);

  // データ読み込み状態
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useLocalStorage, setUseLocalStorage] = useState(true); // 最初からローカルストレージを使用
  const [forceLocalStorage, setForceLocalStorage] = useState(false); // 強制的にローカルストレージを使用するかどうか
  const [debug, setDebug] = useState(false); // デバッグモード
  const [debugOutput, setDebugOutput] = useState([]); // デバッグ出力
  const [tableContent, setTableContent] = useState([]); // テーブル内容

  // Supabase接続テスト結果
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [supabaseEnv, setSupabaseEnv] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "設定済み" : "未設定",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "設定済み" : "未設定",
  });

  // 現在時刻の状態
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clerkのユーザー情報
  const { isSignedIn, user } = useUser();

  // タイマーの参照
  const timerRef = useRef(null);
  const studyTimerRef = useRef(null);
  const clockRef = useRef(null);

  // 音声通知
  const alarmSound = useRef(null);

  // 各タイマーに対応する時間
  const timeModes = {
    pomodoro: pomodoroTime,
    shortBreak: shortBreakTime,
    longBreak: longBreakTime,
  };

  // 現在のモードに対応するラベル
  const modeLabels = {
    pomodoro: "集中時間",
    shortBreak: "短い休憩",
    longBreak: "長い休憩",
  };

  // 現在のモードの色
  const modeColors = {
    pomodoro: "bg-orange-400",
    shortBreak: "bg-green-400",
    longBreak: "bg-blue-400",
  };

  // デバッグログを追加
  const logDebug = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      message: message,
      data: data,
    };
    setDebugOutput((prev) => [...prev, logEntry]);
    console.log(`[DEBUG] ${message}`, data);
  };

  // Supabase接続テスト実行
  const runConnectionTest = async () => {
    setConnectionTestResult({ testing: true });
    try {
      logDebug("接続テスト実行中...");
      const result = await testSupabaseConnection();
      setConnectionTestResult(result);
      logDebug("接続テスト結果:", result);

      // 接続成功かつ強制モードでなければSupabaseを使用
      if (result.success && !forceLocalStorage) {
        setUseLocalStorage(false);
      } else {
        setUseLocalStorage(true);
      }
    } catch (error) {
      logDebug("接続テスト例外:", error);
      setConnectionTestResult({ success: false, error });
      setUseLocalStorage(true);
    }
  };

  // データストレージモードの切替
  const toggleStorageMode = () => {
    // 強制的にローカルストレージを使うかどうかをトグル
    const newForceMode = !forceLocalStorage;
    setForceLocalStorage(newForceMode);

    // 強制モードが有効なら、ローカルストレージを使用
    if (newForceMode) {
      setUseLocalStorage(true);
      logDebug("ストレージモード: ローカルストレージを強制");
    } else {
      // 最新の接続テスト結果に基づいて設定
      const newUseLocal = !connectionTestResult?.success;
      setUseLocalStorage(newUseLocal);
      logDebug(`ストレージモード: ${newUseLocal ? "ローカルストレージ" : "Supabase"}`);
    }
  };

  // デバッグモードの切替
  const toggleDebugMode = () => {
    setDebug(!debug);
  };

  // テストデータ作成
  const createTestData = async () => {
    if (!isSignedIn || !user) {
      logDebug("テストデータ作成: ユーザーがログインしていません");
      return;
    }

    try {
      logDebug("テストデータ作成開始");
      const result = await timerService.createTestData(user.id);
      logDebug("テストデータ作成成功:", result);
      alert("テストデータを作成しました！");

      // テーブル内容を更新
      showTableContent();
    } catch (error) {
      logDebug("テストデータ作成エラー:", error);
      alert(`テストデータ作成エラー: ${error.message || "不明なエラー"}`);
    }
  };

  // テーブル内容確認
  const showTableContent = async () => {
    try {
      logDebug("テーブル内容確認開始");
      const result = await timerService.showTableContent();
      logDebug("テーブル内容取得成功:", result);
      setTableContent(result || []);
    } catch (error) {
      logDebug("テーブル内容取得エラー:", error);
      setTableContent([]);
    }
  };

  // 全てのデータを取得
  const getAllData = async () => {
    try {
      logDebug("全データ取得開始");
      const result = await timerService.getAllTimerData();
      logDebug("全データ取得成功:", result);
      setTableContent(result || []);
    } catch (error) {
      logDebug("全データ取得エラー:", error);
      setTableContent([]);
    }
  };

  // 初期化時に接続テスト実行
  useEffect(() => {
    runConnectionTest();
    logDebug("初期化完了");
    logDebug("ユーザー情報:", isSignedIn ? { id: user?.id } : "未ログイン");
  }, [isSignedIn, user]);

  // ローカルストレージからデータをロードする関数
  const loadFromLocalStorage = async () => {
    logDebug("ローカルストレージからデータをロード中");
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `studyData_${today}`;

    try {
      const storedData = localStorage.getItem(storageKey);

      if (storedData) {
        const data = JSON.parse(storedData);
        logDebug("ローカルストレージからロードしたデータ:", data);
        setTodayStudyTime(data.todayStudyTime || 0);
        setTodayPomodoros(data.todayPomodoros || 0);
      } else {
        logDebug("ローカルストレージにデータがありません。初期値を設定します。");
        setTodayStudyTime(0);
        setTodayPomodoros(0);
      }
    } catch (localStorageError) {
      logDebug("ローカルストレージ読み込みエラー:", localStorageError);
      throw localStorageError;
    }
  };

  // ローカルストレージにデータを保存する関数
  const saveToLocalStorage = async () => {
    logDebug("ローカルストレージにデータを保存中");
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `studyData_${today}`;

    try {
      const data = {
        date: today,
        todayStudyTime,
        todayPomodoros,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      logDebug("ローカルストレージにデータを保存しました:", data);
    } catch (localStorageError) {
      logDebug("ローカルストレージ保存エラー:", localStorageError);
      throw localStorageError;
    }
  };

  // Supabaseからデータをロードする関数
  const loadFromSupabase = async () => {
    logDebug("Supabaseからデータをロード中");
    const today = new Date().toISOString().split("T")[0];

    try {
      // ユーザーIDの確認
      logDebug("ロード対象ユーザーID:", user.id);

      // timerServiceを使ってデータ取得
      const data = await timerService.getUserTimerData(user.id, today);

      if (data) {
        logDebug("Supabaseからロードしたデータ:", data);
        setTodayStudyTime(data.study_time_seconds || 0);
        setTodayPomodoros(data.pomodoro_count || 0);
      } else {
        logDebug("本日のデータは存在しません。初期値を設定します。");
        setTodayStudyTime(0);
        setTodayPomodoros(0);
      }
    } catch (supabaseError) {
      logDebug("Supabeデータロードエラー:", supabaseError);
      throw supabaseError;
    }
  };

  // Supabaseにデータを保存する関数
  const saveToSupabase = async () => {
    logDebug("Supabaseにデータを保存中");
    const today = new Date().toISOString().split("T")[0];

    try {
      // ユーザーIDの確認
      logDebug("保存対象ユーザーID:", user.id);

      // timerServiceを使ってデータ保存
      await timerService.saveTimerData(user.id, today, todayStudyTime, todayPomodoros);
      logDebug("Supabaseにデータを保存しました");

      // テーブル内容を更新（デバッグ中の場合）
      if (debug) {
        showTableContent();
      }
    } catch (supabaseError) {
      logDebug("Supabaseデータ保存エラー:", supabaseError);
      throw supabaseError;
    }
  };

  // データをロードする関数
  const loadStudyData = async () => {
    if (!isSignedIn || !user) {
      logDebug("データロード: ユーザーがログインしていません");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logDebug(`データロード開始 (モード: ${useLocalStorage ? "ローカルストレージ" : "Supabase"})`);

      if (useLocalStorage) {
        // ローカルストレージからロード
        await loadFromLocalStorage();
      } else {
        try {
          // Supabaseからロード
          await loadFromSupabase();
        } catch (supabaseError) {
          logDebug("Supabase呼び出しエラー:", supabaseError);
          logDebug("フォールバック: ローカルストレージからデータをロードします");
          setUseLocalStorage(true);
          await loadFromLocalStorage();
        }
      }
    } catch (error) {
      logDebug("データロード処理エラー:", error);
      setError(`データロード処理エラー: ${error.message || "不明なエラー"}`);
      // 最終手段: 初期値を設定
      setTodayStudyTime(0);
      setTodayPomodoros(0);
    } finally {
      setIsLoading(false);
    }
  };

  // データを保存する関数
  const saveStudyData = async () => {
    if (!isSignedIn || !user) {
      logDebug("データ保存: ユーザーがログインしていません");
      return;
    }
    if (todayStudyTime <= 0 && todayPomodoros <= 0) {
      logDebug("データ保存: 保存するデータがありません");
      return; // 保存するデータがない場合はスキップ
    }

    try {
      logDebug(`データ保存開始 (モード: ${useLocalStorage ? "ローカルストレージ" : "Supabase"})`);

      if (useLocalStorage) {
        // ローカルストレージに保存
        await saveToLocalStorage();
      } else {
        try {
          // Supabaseに保存
          await saveToSupabase();
        } catch (supabaseError) {
          logDebug("Supabeデータ保存エラー:", supabaseError);
          logDebug("フォールバック: ローカルストレージにデータを保存します");
          setUseLocalStorage(true);
          await saveToLocalStorage();
        }
      }
    } catch (error) {
      logDebug("データ保存処理エラー:", error);
      setError(`データ保存処理エラー: ${error.message || "不明なエラー"}`);
    }
  };

  // 初期化時にデータをロード
  useEffect(() => {
    if (isSignedIn && user) {
      loadStudyData();
    }
  }, [isSignedIn, user, useLocalStorage]);

  // 現在時刻を更新
  useEffect(() => {
    clockRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockRef.current);
  }, []);

  // 定期的にデータを保存（1分ごと）
  useEffect(() => {
    if (!isSignedIn || !user) return;

    const saveInterval = setInterval(() => {
      saveStudyData();
    }, 60000); // 1分ごとに保存

    return () => clearInterval(saveInterval);
  }, [isSignedIn, user, todayStudyTime, todayPomodoros, useLocalStorage]);

  // ページを離れる前に保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStudyData();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveStudyData(); // コンポーネントのアンマウント時にも保存
    };
  }, [isSignedIn, user, todayStudyTime, todayPomodoros, useLocalStorage]);

  // モード変更時にタイマーをリセット
  useEffect(() => {
    setTimeLeft(timeModes[currentMode]);
  }, [currentMode, pomodoroTime, shortBreakTime, longBreakTime]);

  // タイマー終了時のポモドーロカウンター処理修正
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            // 音声通知を再生
            if (alarmSound.current) {
              alarmSound.current.play().catch((e) => logDebug("音声再生エラー:", e));
            }

            // タイマー終了時の処理
            if (currentMode === "pomodoro") {
              // カウンターの更新 - ポモドーロ完了数のみここで更新
              const newCount = completedPomodoros + 1;
              setCompletedPomodoros(newCount);

              // Pomodoro完了数に応じて次のモードを決定
              if (newCount % pomodoroGoal === 0) {
                setCurrentMode("longBreak");
              } else {
                setCurrentMode("shortBreak");
              }
            } else if (currentMode === "longBreak") {
              // 長休憩後はカウンターをリセット
              setCompletedPomodoros(0);
              setCurrentMode("pomodoro");
            } else {
              // 短い休憩後は集中モードに戻る
              setCurrentMode("pomodoro");
            }

            // どのモードからどのモードに移行しても、2秒後に自動的にタイマーを開始
            setTimeout(() => {
              setIsRunning(true);
            }, 2000);

            setIsRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, currentMode, pomodoroGoal, completedPomodoros]);

  // 別のカウンターuseEffectを追加
  useEffect(() => {
    // completedPomodorosが変化したとき、今日のポモドーロカウンターを更新
    // 長休憩後のリセットでは増加しないように条件を追加
    if (completedPomodoros > 0 && completedPomodoros % pomodoroGoal !== 0) {
      setTodayPomodoros((prev) => Math.max(prev, Math.ceil(completedPomodoros)));
    } else if (completedPomodoros === 0) {
      // カウンターがリセットされた場合は何もしない
    } else {
      // 長休憩に入るタイミング
      setTodayPomodoros((prev) => Math.max(prev, Math.ceil(completedPomodoros / pomodoroGoal) * pomodoroGoal));
    }
  }, [completedPomodoros, pomodoroGoal]);

  // ポモドーロと学習時間トラッキングの連携
  useEffect(() => {
    // ポモドーロの集中モードが実行中の場合のみ学習時間をカウント
    if (isRunning && currentMode === "pomodoro") {
      // ポモドーロ専用のタイマーカウント（秒単位で加算）
      studyTimerRef.current = setInterval(() => {
        setTodayStudyTime((prev) => prev + 1);
      }, 1000);
    } else {
      // ポモドーロが一時停止されたか、集中モード以外になった場合
      clearInterval(studyTimerRef.current);
    }

    return () => {
      clearInterval(studyTimerRef.current);
    };
  }, [isRunning, currentMode]);

  // タイマーコントロール
  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timeModes[currentMode]);
  };

  // 時間のフォーマット（秒→mm:ss）
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 長時間のフォーマット（秒→hh:mm:ss）
  const formatLongTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 現在時刻のフォーマットを分単位に変更
  const formatCurrentTime = (date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 設定時間の更新
  const updatePomodoroTime = (e) => {
    const time = parseInt(e.target.value) * 60;
    setPomodoroTime(time);
    if (currentMode === "pomodoro" && !isRunning) {
      setTimeLeft(time);
    }
  };

  const updateShortBreakTime = (e) => {
    const time = parseInt(e.target.value) * 60;
    setShortBreakTime(time);
    if (currentMode === "shortBreak" && !isRunning) {
      setTimeLeft(time);
    }
  };

  const updateLongBreakTime = (e) => {
    const time = parseInt(e.target.value) * 60;
    setLongBreakTime(time);
    if (currentMode === "longBreak" && !isRunning) {
      setTimeLeft(time);
    }
  };

  // ユーザーへの挨拶を表示
  const userGreeting = () => {
    if (isSignedIn && user) {
      return <div className="text-sm text-gray-400 mb-2">こんにちは、{user.firstName || "ユーザー"}さん！今日も頑張りましょう。</div>;
    }
    return null;
  };

  // 日付をフォーマット
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">学習タイマー</h1>

      {/* Supabase接続テスト表示 */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Supabase接続テスト</h3>
          <div className="flex space-x-2">
            <button onClick={toggleDebugMode} className={`px-3 py-1 ${debug ? "bg-purple-500" : "bg-gray-500"} text-white rounded text-sm`}>
              {debug ? "デバッグ表示中" : "デバッグ"}
            </button>
            <button onClick={toggleStorageMode} className={`px-3 py-1 ${forceLocalStorage ? "bg-yellow-500" : "bg-blue-500"} text-white rounded text-sm`}>
              {forceLocalStorage ? "ローカルストレージ使用中" : "Supabase優先"}
            </button>
            <button onClick={runConnectionTest} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              再テスト
            </button>
          </div>
        </div>

        {connectionTestResult ? (
          connectionTestResult.testing ? (
            <p>テスト中...</p>
          ) : connectionTestResult.success ? (
            <div className="text-green-600">
              <p>接続成功！データベースとの通信が正常です。</p>
              <p className="text-xs mt-1">データストレージ: {useLocalStorage ? "ローカルストレージ" : "Supabase"}</p>
            </div>
          ) : (
            <div className="text-red-600">
              <p>接続エラー: {connectionTestResult.error?.message || "不明なエラー"}</p>
              <p className="text-sm mt-1">ローカルストレージを使用します</p>
            </div>
          )
        ) : (
          <p>テストが実行されていません</p>
        )}

        {/* 環境変数ステータス */}
        <div className="mt-2 text-xs">
          <p>環境変数ステータス:</p>
          <p>NEXT_PUBLIC_SUPABASE_URL: {supabaseEnv.url}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseEnv.key}</p>
          {isSignedIn && user && <p>ユーザーID: {user.id}</p>}
        </div>

        {/* デバッグボタン */}
        {connectionTestResult?.success && (
          <div className="mt-2 flex space-x-2">
            <button onClick={createTestData} className="px-3 py-1 bg-green-500 text-white rounded text-sm">
              テストデータ作成
            </button>
            <button onClick={showTableContent} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              テーブル内容確認
            </button>
            <button onClick={getAllData} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              全データ取得
            </button>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ポモドーロタイマー */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-medium mb-4">ポモドーロタイマー</h2>

          <div className="mb-6">
            <div className="flex justify-center gap-4 mb-4">
              <button onClick={() => setCurrentMode("pomodoro")} className={`px-4 py-2 rounded-md ${currentMode === "pomodoro" ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                集中
              </button>
              <button onClick={() => setCurrentMode("shortBreak")} className={`px-4 py-2 rounded-md ${currentMode === "shortBreak" ? "bg-green-400 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                短休憩
              </button>
              <button onClick={() => setCurrentMode("longBreak")} className={`px-4 py-2 rounded-md ${currentMode === "longBreak" ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                長休憩
              </button>
            </div>

            <div className={`text-center p-8 rounded-full mx-auto w-60 h-60 flex flex-col items-center justify-center ${modeColors[currentMode]}`}>
              <div className="text-xs font-medium text-white/80 mb-1">{modeLabels[currentMode]}</div>
              <div className="text-5xl font-bold text-white">{formatTime(timeLeft)}</div>
              <div className="text-xs text-white/80 mt-2">
                完了: {completedPomodoros} / {pomodoroGoal}
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              {!isRunning ? (
                <button onClick={startTimer} className="px-6 py-2 bg-indigo-400 text-white rounded-md hover:bg-indigo-700">
                  開始
                </button>
              ) : (
                <button onClick={pauseTimer} className="px-6 py-2 bg-yellow-400 text-white rounded-md hover:bg-yellow-700">
                  一時停止
                </button>
              )}
              <button onClick={resetTimer} className="px-6 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-700">
                リセット
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">タイマー設定</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">集中時間（分）</label>
                <input type="number" min="1" max="60" value={pomodoroTime / 60} onChange={updatePomodoroTime} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isRunning} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">短休憩（分）</label>
                <input type="number" min="1" max="30" value={shortBreakTime / 60} onChange={updateShortBreakTime} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isRunning} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">長休憩（分）</label>
                <input type="number" min="1" max="60" value={longBreakTime / 60} onChange={updateLongBreakTime} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isRunning} />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm text-gray-400 mb-1">長休憩までの回数</label>
              <input type="number" min="1" max="10" value={pomodoroGoal} onChange={(e) => setPomodoroGoal(parseInt(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-md" disabled={isRunning} />
            </div>
          </div>
        </div>

        {/* 情報表示パネル */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-medium mb-4">学習状況</h2>

          {userGreeting()}

          <div className="mb-6 text-center">
            {/* 現在時刻 */}
            <div className="bg-indigo-100 p-6 rounded-lg mb-4">
              <div className="text-sm text-indigo-400 mb-1">現在時刻</div>
              <div className="text-4xl font-bold text-indigo-700">{formatCurrentTime(currentTime)}</div>
            </div>

            {isLoading ? (
              <div className="bg-indigo-100 p-6 rounded-lg mb-4 animate-pulse">
                <div className="text-sm text-indigo-400 mb-1">データ読み込み中...</div>
              </div>
            ) : (
              <>
                {/* 学習時間 */}
                <div className="bg-indigo-100 p-6 rounded-lg mb-4">
                  <div className="text-sm text-indigo-400 mb-1">今日の学習時間</div>
                  <div className="text-4xl font-bold text-indigo-700">{formatLongTime(todayStudyTime)}</div>
                </div>

                {/* ポモドーロ回数 */}
                <div className="bg-gray-100 p-6 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">今日のポモドーロ</div>
                  <div className="text-4xl font-bold text-gray-700">{todayPomodoros}回</div>
                </div>
              </>
            )}
          </div>

          <div className="border-t mt-6 pt-4">
            <h3 className="font-medium mb-3">ヒント</h3>
            <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800">
              <p>ポモドーロタイマーの集中モード中のみ学習時間がカウントされます。休憩時間はカウントされません。</p>
              <p className="mt-2">タイマーの一時停止中も学習時間はカウントされません。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 通知 */}
      <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
        <h3 className="font-medium mb-1">データストレージ: {useLocalStorage ? "ローカルストレージ" : "Supabase"}</h3>
        <p className="text-sm">{useLocalStorage ? "現在、データはブラウザのローカルストレージに保存されています。上部の「Supabase優先」ボタンを押すと、接続に成功した場合はデータベースに保存されます。" : "現在、データはSupabaseデータベースに保存されています。上部の切替ボタンでローカルストレージに切り替えることができます。"}</p>
      </div>

      {/* テーブル内容 */}
      {debug && tableContent.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg shadow overflow-x-auto">
          <h3 className="font-medium mb-3">テーブル内容</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ユーザーID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">学習時間(秒)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ポモドーロ数</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">更新日時</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-xs">
              {tableContent.map((row) => (
                <tr key={row.id} className={row.user_id === user?.id ? "bg-green-50" : ""}>
                  <td className="px-3 py-2 whitespace-nowrap">{row.id.substring(0, 8)}...</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.user_id.substring(0, 8)}...</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.study_time_seconds} ({formatTime(row.study_time_seconds)})
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.pomodoro_count}回</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(row.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* デバッグログ */}
      {debug && (
        <div className="mt-6 bg-gray-800 text-white p-4 rounded-lg">
          <h3 className="font-medium mb-3 text-gray-200">デバッグログ</h3>
          <div className="overflow-auto max-h-64 text-xs font-mono">
            {debugOutput.length === 0 ? (
              <p className="text-gray-400">ログはありません</p>
            ) : (
              <ul className="space-y-1">
                {debugOutput.map((log, index) => (
                  <li key={index} className="border-b border-gray-700 pb-1">
                    <span className="text-gray-400">[{log.time}]</span> {log.message}
                    {log.data && <pre className="ml-5 text-green-300 mt-1 overflow-x-auto">{typeof log.data === "object" ? JSON.stringify(log.data, null, 2) : log.data}</pre>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 開発情報 */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
        <h3 className="font-medium mb-2">Supabase設定手順</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Supabaseプロジェクトを作成する</li>
          <li>`.env.local`ファイルにURLとAnonキーを設定する</li>
          <li>Supabaseの管理画面でテーブルを作成する</li>
          <li>Row Level Security (RLS)ポリシーを設定する</li>
        </ol>
        <p className="mt-2">現在の環境変数:</p>
        <pre className="bg-gray-700 text-white p-2 rounded mt-1 overflow-auto">
          NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "未設定"}
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "[設定済み - セキュリティのため非表示]" : "未設定"}
        </pre>
      </div>

      {/* 音声通知用のエレメント */}
      <audio ref={alarmSound} preload="auto">
        <source src="/sounds/alarm.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
