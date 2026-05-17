/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import HelpPage from "@/app/help/page";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";


// Mock global navigation useRouter
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

// Mock browser API navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn().mockImplementation(() =>
    Promise.resolve({
      getTracks: () => [
        {
          stop: jest.fn(),
        },
      ],
    })
  ),
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: mockMediaDevices,
  writable: true,
});

Object.defineProperty(window, "RTCPeerConnection", {
  value: jest.fn(),
  writable: true,
});

global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
);



describe("LinkUp Phase 3 Production Features & SEO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("System Diagnostics FAQ Dashboard", () => {
    it("renders Help & Diagnostics elements correctly", () => {
      render(<HelpPage />);
      expect(screen.getByText("System Diagnostic Tests")).toBeInTheDocument();
      expect(screen.getByText("Browser API Support")).toBeInTheDocument();
      expect(screen.getByText("Camera Access Test")).toBeInTheDocument();
      expect(screen.getByText("Microphone Access Test")).toBeInTheDocument();
      expect(screen.getByText("Socket.io Signaling Connection")).toBeInTheDocument();
      expect(screen.getByText("Connection Latency & Performance")).toBeInTheDocument();
    });

    it("toggles visual FAQ item answers upon clicking headers", () => {
      render(<HelpPage />);
      
      const faqQuestion = screen.getByText("How do I invite others to a LinkUp meeting?");
      expect(screen.queryByText(/Simply click the 'Copy Link' button/)).not.toBeInTheDocument();

      fireEvent.click(faqQuestion);
      expect(screen.getByText(/Simply click the 'Copy Link' button/)).toBeInTheDocument();

      fireEvent.click(faqQuestion);
      expect(screen.queryByText(/Simply click the 'Copy Link' button/)).not.toBeInTheDocument();
    });

    it("completes full systems diagnostics sequence successfully", async () => {
      render(<HelpPage />);
      const runBtn = screen.getByRole("button", { name: "Run Diagnostics" });

      // Run check
      await act(async () => {
        fireEvent.click(runBtn);
      });

      // Confirm success logs via waitFor
      await waitFor(() => {
        expect(screen.getByText(/Fully Compatible/)).toBeInTheDocument();
        expect(screen.getByText(/Camera active & permissions verified/)).toBeInTheDocument();
        expect(screen.getByText(/Microphone active & permissions verified/)).toBeInTheDocument();
        expect(screen.getByText(/Signaling endpoint responsive & online/)).toBeInTheDocument();
        expect(screen.getByText(/Ping:/)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe("Dynamic SEO Configuration Elements", () => {
    it("returns correct sitemap URLs and metadata prioritizations", () => {
      const urls = sitemap();
      expect(urls).toHaveLength(2);
      expect(urls[0].url).toBe("https://linkup-calling.vercel.app");
      expect(urls[0].priority).toBe(1.0);
      expect(urls[1].url).toBe("https://linkup-calling.vercel.app/help");
      expect(urls[1].priority).toBe(0.8);
    });

    it("declares strict robots crawl patterns blocking private pathways", () => {
      const config = robots();
      expect(config.rules).toBeDefined();
      const rules = config.rules as any;
      expect(rules.allow).toContain("/help");
      expect(rules.disallow).toContain("/room/");
      expect(rules.disallow).toContain("/api/");
    });
  });
});
