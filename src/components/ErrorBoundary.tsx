import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] px-6 py-16">
          <div className="max-w-lg w-full bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="font-display text-3xl font-semibold text-stone-900 mb-3">
              Something went wrong
            </h2>
            <p className="text-sm text-stone-600 mb-6 break-words">
              {this.state.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.hash = '#/';
              }}
              className="px-5 py-2.5 rounded-lg bg-[#C83E5B] text-white text-sm font-medium hover:bg-[#b0324d] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
