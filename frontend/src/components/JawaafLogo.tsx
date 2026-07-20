import React from "react";

interface JawaafLogoProps {
  className?: string;
  isWhite?: boolean;
}

export default function JawaafLogo({ className = "w-[620px]", isWhite = false }: JawaafLogoProps) {
    const textColor = isWhite ? "#FFFFFF" : "#2d2d2d";
    const subTextColor = isWhite ? "rgba(255,255,255,0.8)" : "#3c3c3c";
    const academyTextColor = isWhite ? "rgba(255,255,255,0.9)" : "#333";

    return (
        <svg
            viewBox="0 0 1000 350"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* COLORS */}
            {/* Dark: #2d2d2d, Blue: #2C4B78, Coral: #EE6055 */}

            {/* ICON GRID - Synthesized with Text Baselines */}
            <g transform="translate(60, 95)">
                {/* Row 1 (Blue) - Center y=0 */}
                <path d="M40,-30 C65,-30 75,-15 75,0 C75,15 65,32 40,32 C15,32 5,15 5,0 C5,-15 15,-30 40,-30" fill="#2C4B78" />
                <path d="M120,-28 C145,-28 155,-13 155,2 C155,17 145,34 120,34 C95,34 85,17 85,2 C85,-13 95,-28 120,-28" fill="#2C4B78" />
                <path d="M200,-31 C225,-31 235,-16 235,-1 C235,14 225,31 200,31 C175,31 165,14 165,-1 C165,-16 175,-31 200,-31" fill="#2C4B78" />

                {/* Row 2 (Coral) - Center y=85 */}
                <path d="M42,55 C67,55 77,70 77,85 C77,100 67,117 42,117 C17,117 7,100 7,85 C7,70 17,55 42,55" fill="#EE6055" />
                <path d="M122,58 C147,58 157,73 157,88 C157,103 147,120 122,120 C97,120 87,103 87,88 C87,73 97,58 122,58" fill="#EE6055" />

                {/* Crescent (Convex LEFT, Bite RIGHT) */}
                <defs>
                    <mask id="crescentMask">
                        <rect x="160" y="45" width="100" height="80" fill="white" />
                        <circle cx="230" cy="90" r="30" fill="black" />
                    </mask>
                </defs>
                <circle cx="198" cy="90" r="30" fill="#EE6055" mask="url(#crescentMask)" />

                {/* Row 3 (Blue) - Center y=170 */}
                <path d="M40,140 C65,140 75,155 75,170 C75,185 65,202 40,202 C15,202 5,185 5,170 C5,155 15,140 40,140" fill="#2C4B78" />
                <path d="M120,143 C145,143 155,158 155,173 C155,188 145,205 120,205 C95,205 85,188 85,173 C85,158 95,143 120,143" fill="#2C4B78" />
            </g>

            {/* TEXT AREA - Synthesized with Icon Grid */}
            <g transform="translate(310, 110)">
                {/* Tagline */}
                <text
                    x="15"
                    y="0"
                    fontFamily="var(--font-lora)"
                    fontStyle="italic"
                    fontSize="52"
                    fontWeight="500"
                    fill={subTextColor}
                >
                    Answers to All
                </text>

                {/* Precision Horizontal Line */}
                <rect x="380" y="-20" width="150" height="15" fill="#2C4B78" />

                {/* Brand Name "Jawaaf" */}
                <text
                    x="0"
                    y="115"
                    fontFamily="var(--font-league-spartan)"
                    fontWeight="700"
                    fontSize="150"
                    letterSpacing="10"
                >
                    <tspan fill={textColor}>Jaw</tspan>
                    <tspan fill="#2C4B78">aa</tspan>
                    <tspan fill={textColor}>f</tspan>
                </text>

                {/* Subtitle "CONSULTING ACADEMY" */}
                <text
                    x="0"
                    y="170"
                    fontFamily="Canvas Sans"
                    fontSize="29"
                    fontWeight="1500"
                    fill={academyTextColor}
                    textLength="510"
                    letterSpacing="2"
                >
                    CONSULTING ACADEMY
                </text>
            </g>
        </svg>
    );
}
