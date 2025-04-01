// src/app/timer/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

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

  // src/app/timer/page.js の loadStudyData と saveStudyData 関数を修正
  // ローカルストレージを使用したバージョン

  // APIからデータをロードする関数（ローカルストレージ版）
  const loadStudyData = async () => {
    if (typeof window === "undefined") return; // サーバーサイドでは実行しない

    try {
      // ローカルストレージからデータをロード
      const today = new Date().toISOString().split("T")[0];
      const storageKey = `studyData_${today}`;
      const storedData = localStorage.getItem(storageKey);

      if (storedData) {
        const data = JSON.parse(storedData);
        setTodayStudyTime(data.todayStudyTime || 0);
        setTodayPomodoros(data.todayPomodoros || 0);
        console.log("Loaded study data from local storage:", data);
      }

      // API呼び出しは後で実装
      // 開発中はローカルストレージのみを使用
      /*
      const response = await fetch(`/api/pomodoro?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setTodayStudyTime(data.todayStudyTime || 0);
        setTodayPomodoros(data.todayPomodoros || 0);
      } else {
        console.error('Failed to load study data');
      }
      */
    } catch (error) {
      console.error("Error loading study data:", error);
    }
  };

  // APIにデータを保存する関数（ローカルストレージ版）
  const saveStudyData = async () => {
    if (typeof window === "undefined") return; // サーバーサイドでは実行しない

    try {
      const today = new Date().toISOString().split("T")[0];
      const storageKey = `studyData_${today}`;
      const data = {
        date: today,
        todayStudyTime,
        todayPomodoros,
        lastUpdated: new Date().toISOString(),
      };

      // ローカルストレージにデータを保存
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log("Saved study data to local storage:", data);

      // API呼び出しは後で実装
      /*
      await fetch('/api/pomodoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          todayStudyTime,
          todayPomodoros,
        }),
      });
      */
    } catch (error) {
      console.error("Error saving study data:", error);
    }
  };

  // 初期化時にデータをロード
  useEffect(() => {
    loadStudyData();
  }, []);

  // 定期的にデータを保存（1分ごと）
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveStudyData();
    }, 60000); // 1分ごとに保存

    return () => clearInterval(saveInterval);
  }, [todayStudyTime, todayPomodoros]);

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
  }, [todayStudyTime, todayPomodoros]);

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
              alarmSound.current.play().catch((e) => console.log("音声再生エラー:", e));
            }

            // タイマー終了時の処理
            if (currentMode === "pomodoro") {
              // カウンターの更新 - ポモドーロ完了数のみここで更新
              const newCount = completedPomodoros + 1;
              setCompletedPomodoros(newCount);

              // 今日のポモドーロカウンターは別のuseEffectで更新するので、ここでは削除
              // setTodayPomodoros(prev => prev + 1);

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
      setTodayPomodoros(Math.ceil(completedPomodoros));
    } else if (completedPomodoros === 0) {
      // カウンターがリセットされた場合は何もしない
    } else {
      // 長休憩に入るタイミング
      setTodayPomodoros(Math.ceil(completedPomodoros / pomodoroGoal) * pomodoroGoal);
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

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">学習タイマー</h1>

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
    </div>
  );
}
