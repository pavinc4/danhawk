import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, Star, Send } from "lucide-react";

type FeedbackType = "bug" | "feature" | "general" | "rating";

const feedbackTypes: { type: FeedbackType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: "bug", label: "Bug Report", icon: <Bug size={15} />, desc: "Something isn't working" },
    { type: "feature", label: "Feature Request", icon: <Lightbulb size={15} />, desc: "Suggest an improvement" },
    { type: "general", label: "General Feedback", icon: <MessageSquare size={15} />, desc: "Share your thoughts" },
    { type: "rating", label: "Rate Danhawk", icon: <Star size={15} />, desc: "How are we doing?" },
];

export default function FeedbackPage() {
    const [selectedType, setSelectedType] = useState<FeedbackType>("general");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        if (!message.trim() && selectedType !== "rating") return;
        if (selectedType === "rating" && rating === 0) return;
        // TODO: wire up backend submission
        setSubmitted(true);
    };

    const reset = () => {
        setSubmitted(false);
        setMessage("");
        setEmail("");
        setRating(0);
        setSelectedType("general");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minHeight: 0 }}>

            {/* Page header */}
            <div style={{
                flexShrink: 0,
                display: "flex", alignItems: "center",
                padding: "18px 24px 14px",
                borderBottom: "1px solid var(--border-subtle)",
            }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
                    Feedback
                </h1>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", minHeight: 0 }}>
                <div style={{ maxWidth: 520 }}>

                    {submitted ? (
                        /* ── Thank you state ── */
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", padding: "48px 0", gap: 16, textAlign: "center",
                        }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16,
                                background: "var(--green-glow)",
                                border: "1px solid rgba(61,186,110,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Send size={20} style={{ color: "var(--green)" }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
                                    Thanks for your feedback!
                                </p>
                                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                                    We appreciate you taking the time to help improve Danhawk.
                                </p>
                            </div>
                            <button
                                onClick={reset}
                                style={{
                                    marginTop: 8, padding: "7px 18px",
                                    background: "var(--bg-hover)", border: "1px solid var(--border-subtle)",
                                    borderRadius: 8, color: "var(--text-secondary)", fontSize: 12,
                                    cursor: "pointer", transition: "all 0.15s",
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"}
                            >
                                Send another
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ── Type selector ── */}
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                                    Type
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    {feedbackTypes.map(ft => (
                                        <button
                                            key={ft.type}
                                            onClick={() => setSelectedType(ft.type)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 10,
                                                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                                                textAlign: "left", transition: "all 0.12s",
                                                border: `1px solid ${selectedType === ft.type ? "rgba(59,139,219,0.4)" : "var(--border-subtle)"}`,
                                                background: selectedType === ft.type
                                                    ? "linear-gradient(135deg, rgba(59,139,219,0.12) 0%, rgba(59,139,219,0.05) 100%)"
                                                    : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                                            }}
                                            onMouseEnter={e => { if (selectedType !== ft.type) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)"; }}
                                            onMouseLeave={e => { if (selectedType !== ft.type) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; }}
                                        >
                                            <span style={{ color: selectedType === ft.type ? "#5ba3e8" : "var(--text-muted)", flexShrink: 0 }}>
                                                {ft.icon}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: 12.5, fontWeight: 500, color: selectedType === ft.type ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1 }}>
                                                    {ft.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1 }}>
                                                    {ft.desc}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Star rating (only for "rating" type) ── */}
                            {selectedType === "rating" && (
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                                        Your Rating
                                    </p>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoveredStar(star)}
                                                onMouseLeave={() => setHoveredStar(0)}
                                                style={{
                                                    background: "none", border: "none", cursor: "pointer", padding: 2,
                                                    transition: "transform 0.1s",
                                                    transform: hoveredStar >= star ? "scale(1.15)" : "scale(1)",
                                                }}
                                            >
                                                <Star
                                                    size={24}
                                                    style={{
                                                        color: (hoveredStar || rating) >= star ? "#e09535" : "var(--text-ghost)",
                                                        fill: (hoveredStar || rating) >= star ? "#e09535" : "none",
                                                        transition: "all 0.12s",
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Message ── */}
                            <div style={{ marginBottom: 20 }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                                    {selectedType === "bug" ? "Describe the bug" : selectedType === "feature" ? "Describe your idea" : "Message"}
                                    {selectedType !== "rating" && <span style={{ color: "#e04535", marginLeft: 3 }}>*</span>}
                                </p>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder={
                                        selectedType === "bug" ? "What happened? Steps to reproduce..." :
                                            selectedType === "feature" ? "What would you like to see added or changed?" :
                                                selectedType === "rating" ? "Any additional comments? (optional)" :
                                                    "Share your thoughts about Danhawk..."
                                    }
                                    style={{
                                        width: "100%", height: 120,
                                        padding: "12px 14px",
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 10,
                                        color: "var(--text-primary)",
                                        fontSize: 13, lineHeight: 1.6,
                                        resize: "none", outline: "none",
                                        transition: "border-color 0.15s",
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                    }}
                                    onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--accent)"}
                                    onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border-subtle)"}
                                />
                            </div>

                            {/* ── Email (optional) ── */}
                            <div style={{ marginBottom: 28 }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                                    Email <span style={{ textTransform: "none", fontWeight: 400, fontSize: 10 }}>(optional — for follow-up)</span>
                                </p>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    style={{
                                        width: "100%", height: 38,
                                        padding: "0 14px",
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 10,
                                        color: "var(--text-primary)",
                                        fontSize: 13, outline: "none",
                                        transition: "border-color 0.15s",
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                    }}
                                    onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--accent)"}
                                    onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border-subtle)"}
                                />
                            </div>

                            {/* ── Submit ── */}
                            <button
                                onClick={handleSubmit}
                                disabled={
                                    (selectedType !== "rating" && !message.trim()) ||
                                    (selectedType === "rating" && rating === 0)
                                }
                                style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "9px 20px",
                                    background: "var(--accent)",
                                    border: "none", borderRadius: 9,
                                    color: "white", fontSize: 13, fontWeight: 500,
                                    cursor: "pointer",
                                    opacity: (selectedType !== "rating" && !message.trim()) || (selectedType === "rating" && rating === 0) ? 0.4 : 1,
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#4a9beb"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
                            >
                                <Send size={13} />
                                Send Feedback
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}