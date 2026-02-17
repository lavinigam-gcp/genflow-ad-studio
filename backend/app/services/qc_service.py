import logging

from app.ai.gemini import GeminiService
from app.config import Settings
from app.models.common import QCScore
from app.models.storyboard import StoryboardQCReport
from app.models.video import VideoQCDimension, VideoQCReport, VideoVariant

logger = logging.getLogger(__name__)


class QCService:
    def __init__(self, gemini: GeminiService, settings: Settings):
        self.gemini = gemini
        self.settings = settings

    async def qc_storyboard(
        self,
        avatar_bytes: bytes,
        product_bytes: bytes,
        storyboard_bytes: bytes,
    ) -> StoryboardQCReport:
        """Run QC on a storyboard image against avatar and product references."""
        raw = await self.gemini.qc_storyboard(
            avatar_bytes=avatar_bytes,
            product_bytes=product_bytes,
            storyboard_bytes=storyboard_bytes,
        )
        return StoryboardQCReport(
            avatar_validation=QCScore(**raw["avatar_validation"]),
            product_validation=QCScore(**raw["product_validation"]),
            composition_quality=QCScore(**raw.get("composition_quality", {"score": 0, "reason": "N/A"})),
        )

    async def qc_video(self, video_uri: str, reference_uri: str) -> VideoQCReport:
        """Run QC on a video against its reference product image."""
        raw = await self.gemini.qc_video(
            video_uri=video_uri,
            reference_image_uri=reference_uri,
        )
        return VideoQCReport(
            technical_distortion=VideoQCDimension(**raw["technical_distortion"]),
            cinematic_imperfections=VideoQCDimension(**raw["cinematic_imperfections"]),
            avatar_consistency=VideoQCDimension(**raw["avatar_consistency"]),
            product_consistency=VideoQCDimension(**raw["product_consistency"]),
            temporal_coherence=VideoQCDimension(**raw["temporal_coherence"]),
            hand_body_integrity=VideoQCDimension(
                **raw.get("hand_body_integrity", {"score": 7, "reasoning": "Not evaluated"})
            ),
            brand_text_accuracy=VideoQCDimension(
                **raw.get("brand_text_accuracy", {"score": 7, "reasoning": "Not evaluated"})
            ),
            overall_verdict=raw.get("overall_verdict", ""),
        )

    def storyboard_passes_qc(
        self,
        report: StoryboardQCReport,
        threshold: int | None = None,
        include_composition: bool = False,
    ) -> bool:
        """Check if avatar and product scores meet the threshold."""
        effective_threshold = threshold or self.settings.storyboard_qc_threshold
        passes = (
            report.avatar_validation.score >= effective_threshold
            and report.product_validation.score >= effective_threshold
        )
        if include_composition and report.composition_quality:
            passes = passes and report.composition_quality.score >= effective_threshold
        return passes

    def video_passes_qc(self, report: VideoQCReport, threshold: int | None = None) -> bool:
        """Check if all video QC dimension scores meet the threshold."""
        threshold = threshold or self.settings.video_qc_threshold
        dims = [
            report.technical_distortion,
            report.cinematic_imperfections,
            report.avatar_consistency,
            report.product_consistency,
            report.temporal_coherence,
            report.hand_body_integrity,
            report.brand_text_accuracy,
        ]
        return all(d.score >= threshold for d in dims if d is not None)

    async def rewrite_prompt(self, original_prompt: str, qc_report: StoryboardQCReport) -> str:
        """Use Gemini to rewrite a prompt based on QC feedback."""
        feedback_parts: list[str] = []
        feedback_parts.append(
            f"Avatar validation score: {qc_report.avatar_validation.score}/100 - "
            f"{qc_report.avatar_validation.reason}"
        )
        feedback_parts.append(
            f"Product validation score: {qc_report.product_validation.score}/100 - "
            f"{qc_report.product_validation.reason}"
        )
        if qc_report.composition_quality:
            feedback_parts.append(
                f"Composition quality score: {qc_report.composition_quality.score}/100 - "
                f"{qc_report.composition_quality.reason}"
            )
        qc_feedback = "\n".join(feedback_parts)
        return await self.gemini.rewrite_prompt(original_prompt, qc_feedback)

    @staticmethod
    def build_video_qc_feedback(qc_report: VideoQCReport) -> str:
        """Build a human-readable QC feedback string from a video QC report."""
        dim_labels = [
            ("Technical distortion", qc_report.technical_distortion),
            ("Cinematic imperfections", qc_report.cinematic_imperfections),
            ("Avatar consistency", qc_report.avatar_consistency),
            ("Product consistency", qc_report.product_consistency),
            ("Temporal coherence", qc_report.temporal_coherence),
            ("Hand/body integrity", qc_report.hand_body_integrity),
            ("Brand/text accuracy", qc_report.brand_text_accuracy),
        ]
        feedback_parts = [
            f"{label} score: {dim.score}/10 - {dim.reasoning}"
            for label, dim in dim_labels
            if dim is not None
        ]
        return "\n".join(feedback_parts)

    async def rewrite_video_prompt(self, original_prompt: str, qc_report: VideoQCReport) -> str:
        """Use Gemini to rewrite a video prompt based on QC feedback."""
        qc_feedback = self.build_video_qc_feedback(qc_report)
        return await self.gemini.rewrite_prompt(original_prompt, qc_feedback)

    def select_best_video_variant(self, variants: list[VideoVariant]) -> int:
        """Select the best video variant using weighted scoring.

        Weights (sum to 1.0):
          avatar_consistency       * 0.20
          product_consistency      * 0.20
          hand_body_integrity      * 0.15
          brand_text_accuracy      * 0.15
          temporal_coherence       * 0.10
          technical_distortion     * 0.10
          cinematic_imperfections  * 0.10

        Returns index of the best variant.
        """
        best_idx = 0
        best_score = -1.0

        for variant in variants:
            if variant.qc_report is None:
                continue
            r = variant.qc_report
            weighted = [
                (r.avatar_consistency, 0.20),
                (r.product_consistency, 0.20),
                (r.hand_body_integrity, 0.15),
                (r.brand_text_accuracy, 0.15),
                (r.temporal_coherence, 0.10),
                (r.technical_distortion, 0.10),
                (r.cinematic_imperfections, 0.10),
            ]
            score = sum(d.score * w for d, w in weighted if d is not None)
            if score > best_score:
                best_score = score
                best_idx = variant.index

        return best_idx
