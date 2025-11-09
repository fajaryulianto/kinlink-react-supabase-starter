import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Github, Twitter } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 text-white p-12 flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <TreePine className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">KinLink</h1>
                <p className="text-green-100 text-sm">Family Tree App</p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">
                Connect Your Family,
                <br />
                Preserve Your Legacy
              </h2>
              <p className="text-lg text-green-100 leading-relaxed">
                Build beautiful family trees, collaborate with relatives, and discover your heritage
                with our intuitive genealogy platform. Start your family's story today.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold mb-2">10K+</div>
                <div className="text-green-100 text-sm">Family Trees Created</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold mb-2">50K+</div>
                <div className="text-green-100 text-sm">Family Members</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-green-100 text-sm">Real-time Sync</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold mb-2">100%</div>
                <div className="text-green-100 text-sm">Secure & Private</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-6 text-green-100 text-sm">
              <span>© 2024 KinLink</span>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/support" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-green-100 text-sm">Follow us:</span>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <TreePine className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">KinLink</h1>
                  <p className="text-gray-600 text-sm">Family Tree App</p>
                </div>
              </div>
              {title && (
                <div className="space-y-2 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                  {subtitle && (
                    <p className="text-gray-600">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            {/* Form Content */}
            {children}

            {/* Mobile Footer */}
            <div className="lg:hidden mt-8 text-center text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Link to="/terms" className="hover:text-gray-900 transition-colors">
                  Terms
                </Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-gray-900 transition-colors">
                  Privacy
                </Link>
                <span>•</span>
                <Link to="/support" className="hover:text-gray-900 transition-colors">
                  Support
                </Link>
              </div>
              <p>© 2024 KinLink. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;