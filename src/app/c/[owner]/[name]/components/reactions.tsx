"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Button } from "@/components/ui/button";

interface ReactionsProps {
  versionId: string;
  initialReactions: Record<string, number>;
}

export default function Reactions({
  versionId,
  initialReactions,
}: ReactionsProps) {
  const [reactions, setReactions] = useState(initialReactions || {});
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());

  // Load user reactions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`reactions_${versionId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserReactions(new Set(parsed));
      } catch (error) {
        console.error("Failed to parse stored reactions:", error);
      }
    }
  }, [versionId]);

  const addReaction = async (emoji: string) => {
    // Check if user already reacted with this emoji
    if (userReactions.has(emoji)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/versions/${versionId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions);

        // Update localStorage
        const newUserReactions = new Set(userReactions).add(emoji);
        setUserReactions(newUserReactions);
        localStorage.setItem(
          `reactions_${versionId}`,
          JSON.stringify([...newUserReactions]),
        );
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
    } finally {
      setIsLoading(false);
      setShowPicker(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex gap-1 mb-3">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            disabled={isLoading}
          >
            ➕
          </Button>

          {showPicker && (
            <div className="absolute top-full left-0 mt-2 z-10">
              <EmojiPicker
                onEmojiClick={(emojiData) => addReaction(emojiData.emoji)}
              />
            </div>
          )}
        </div>

        {Object.entries(reactions).map(([emoji, count]) => (
          <div
            key={emoji}
            className="flex items-center gap-1 px-2 py-1 rounded-full border"
          >
            <span>{emoji}</span>
            <span className="text-gray-500">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
