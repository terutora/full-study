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
  const [useLocalStorage, setUseLocalStorage] = useState(false); // Supabaseをデフォルトに

  // 現在時刻と日付の状態
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);

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

  // 日付変更のチェック
  const checkDateChange = () => {
    const today = new Date().toISOString().split("T")[0];
    if (today !== currentDate) {
      console.log(`日付が変わりました: ${currentDate} → ${today}`);
      setCurrentDate(today);
      // 新しい日付のデータをロード
      setTodayStudyTime(0);
      setTodayPomodoros(0);
      loadStudyData();
    }
  };

  // Supabase接続テスト実行
  const testConnection = async () => {
    try {
      const result = await testSupabaseConnection();
      if (!result.success) {
        console.log("Supabase接続失敗、ローカルストレージにフォールバック");
        setUseLocalStorage(true);
      }
    } catch (error) {
      console.error("接続テストエラー:", error);
      setUseLocalStorage(true);
    }
  };

  // ローカルストレージからデータをロードする関数
  const loadFromLocalStorage = async () => {
    console.log("ローカルストレージからデータをロード中");
    const storageKey = `studyData_${currentDate}`;

    try {
      const storedData = localStorage.getItem(storageKey);

      if (storedData) {
        const data = JSON.parse(storedData);
        // データ形式の統一（ローカルストレージ → Supabase形式に合わせる）
        setTodayStudyTime(data.study_time_seconds || data.todayStudyTime || 0);
        setTodayPomodoros(data.pomodoro_count || data.todayPomodoros || 0);
      } else {
        setTodayStudyTime(0);
        setTodayPomodoros(0);
      }
    } catch (localStorageError) {
      console.error("ローカルストレージ読み込みエラー:", localStorageError);
      throw localStorageError;
    }
  };

  // ローカルストレージにデータを保存する関数
  const saveToLocalStorage = async () => {
    const storageKey = `studyData_${currentDate}`;

    try {
      // Supabase形式に合わせたデータ形式
      const data = {
        date: currentDate,
        study_time_seconds: todayStudyTime,
        pomodoro_count: todayPomodoros,
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (localStorageError) {
      console.error("ローカルストレージ保存エラー:", localStorageError);
      throw localStorageError;
    }
  };

  // Supabaseからデータをロードする関数
  const loadFromSupabase = async () => {
    try {
      // timerServiceを使ってデータ取得
      const data = await timerService.getUserTimerData(user.id, currentDate);

      if (data) {
        setTodayStudyTime(data.study_time_seconds || 0);
        setTodayPomodoros(data.pomodoro_count || 0);
      } else {
        setTodayStudyTime(0);
        setTodayPomodoros(0);
      }
    } catch (supabaseError) {
      console.error("Supabeデータロードエラー:", supabaseError);
      throw supabaseError;
    }
  };

  // Supabaseにデータを保存する関数
  const saveToSupabase = async () => {
    try {
      // timerServiceを使ってデータ保存
      await timerService.saveTimerData(user.id, currentDate, todayStudyTime, todayPomodoros);
    } catch (supabaseError) {
      console.error("Supabaseデータ保存エラー:", supabaseError);
      throw supabaseError;
    }
  };

  // データをロードする関数
  const loadStudyData = async () => {
    if (!isSignedIn || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      if (useLocalStorage) {
        // ローカルストレージからロード
        await loadFromLocalStorage();
      } else {
        try {
          // Supabaseからロード
          await loadFromSupabase();
        } catch (supabaseError) {
          console.error("Supabase呼び出しエラー:", supabaseError);
          setUseLocalStorage(true);
          await loadFromLocalStorage();
        }
      }
    } catch (error) {
      console.error("データロード処理エラー:", error);
      setError(`データの読み込みに失敗しました`);
      // 最終手段: 初期値を設定
      setTodayStudyTime(0);
      setTodayPomodoros(0);
    } finally {
      setIsLoading(false);
    }
  };

  // データを保存する関数
  const saveStudyData = async () => {
    if (!isSignedIn || !user) return;
    if (todayStudyTime <= 0 && todayPomodoros <= 0) return; // 保存するデータがない場合はスキップ

    try {
      if (useLocalStorage) {
        // ローカルストレージに保存
        await saveToLocalStorage();
      } else {
        try {
          // Supabaseに保存
          await saveToSupabase();
        } catch (supabaseError) {
          console.error("Supabeデータ保存エラー:", supabaseError);
          setUseLocalStorage(true);
          await saveToLocalStorage();
        }
      }
    } catch (error) {
      console.error("データ保存処理エラー:", error);
      setError(`データの保存に失敗しました`);
    }
  };

  // 初期化時に接続テストとデータロード
  useEffect(() => {
    if (isSignedIn && user) {
      testConnection();
      loadStudyData();
    }
  }, [isSignedIn, user]);

  // 現在時刻を更新＆日付変更を確認
  useEffect(() => {
    clockRef.current = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      checkDateChange(); // 日付変更のチェック
    }, 1000);

    return () => clearInterval(clockRef.current);
  }, [currentDate]); // currentDateが変わると再実行

  // 定期的にデータを保存（1分ごと）
  useEffect(() => {
    if (!isSignedIn || !user) return;

    const saveInterval = setInterval(() => {
      saveStudyData();
    }, 60000); // 1分ごとに保存

    return () => clearInterval(saveInterval);
  }, [isSignedIn, user, todayStudyTime, todayPomodoros, useLocalStorage, currentDate]);

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
  }, [isSignedIn, user, todayStudyTime, todayPomodoros, useLocalStorage, currentDate]);

  // モード変更時にタイマーをリセット
  useEffect(() => {
    setTimeLeft(timeModes[currentMode]);
  }, [currentMode, pomodoroTime, shortBreakTime, longBreakTime]);

  // タイマー終了時のポモドーロカウンター処理
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

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">学習タイマー</h1>

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
              <div className="text-xs text-indigo-400 mt-1">{currentDate}</div>
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

      {/* 音声通知用のエレメント */}
      <audio ref={alarmSound} preload="auto">
        <source src="/sounds/alarm.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
